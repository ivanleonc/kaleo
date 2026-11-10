import { Injectable, Logger, Optional } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { rows } from '../common/utils/db.js';
import type { OutboxEventInput, OutboxEventRow, OutboxHandler } from './outbox.types.js';

const MAX_ATTEMPTS = 10;

type QueryExecutor = { query(sql: string, parameters?: any[]): Promise<any> };

/**
 * Outbox transaccional sobre PostgreSQL.
 *
 * `enqueue` acepta un QueryRunner para escribir el evento en la misma
 * transacción que el cambio de negocio. `publishPending` usa
 * `FOR UPDATE SKIP LOCKED`, por lo que es seguro con varias instancias.
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);
  private readonly handlers = new Map<string, OutboxHandler[]>();

  constructor(
    private readonly dataSource: DataSource,
    @Optional() @InjectDataSource('auth') private readonly authDataSource?: DataSource,
  ) {}

  registerHandler(eventType: string, handler: OutboxHandler): void {
    const current = this.handlers.get(eventType) ?? [];
    current.push(handler);
    this.handlers.set(eventType, current);
  }

  async enqueue(input: OutboxEventInput, queryRunner?: QueryRunner): Promise<string> {
    const executor: QueryExecutor = queryRunner ?? this.authDataSource ?? this.dataSource;
    const inserted = rows<{ event_id: string }>(await executor.query(
      `INSERT INTO outbox_events
         (event_id, company_id, aggregate_type, aggregate_id, event_type, payload, occurred_at)
       VALUES
         (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6::jsonb, COALESCE($7, now()))
       RETURNING event_id`,
      [
        input.eventId ?? null,
        input.companyId,
        input.aggregateType,
        input.aggregateId ?? null,
        input.eventType,
        JSON.stringify(input.payload ?? {}),
        input.occurredAt ?? null,
      ],
    ));
    return inserted[0]!.event_id;
  }

  async publishPending(limit = 50): Promise<number> {
    const queryRunner = (this.authDataSource ?? this.dataSource).createQueryRunner();
    await queryRunner.connect();
    let started = false;

    try {
      await queryRunner.startTransaction();
      started = true;
      const pending = rows<OutboxEventRow>(await queryRunner.query(
        `SELECT id, event_id, company_id, aggregate_type, aggregate_id, event_type,
                payload, occurred_at, attempts
         FROM outbox_events
         WHERE published_at IS NULL
           AND dead_lettered_at IS NULL
           AND next_attempt_at <= now()
           AND attempts < $2
         ORDER BY occurred_at
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [limit, MAX_ATTEMPTS],
      ));

      for (const event of pending) {
        try {
          for (const handler of this.handlers.get(event.event_type) ?? []) {
            await handler(event);
          }
          await queryRunner.query(
            `UPDATE outbox_events
             SET published_at = now(), attempts = attempts + 1,
                 last_error = NULL, next_attempt_at = now()
             WHERE id = $1`,
            [event.id],
          );
        } catch (error) {
          const message = (error as Error).message.slice(0, 1000);
          const nextAttempts = event.attempts + 1;

          if (nextAttempts >= MAX_ATTEMPTS) {
            await queryRunner.query(
              `UPDATE outbox_events
               SET attempts = $2, last_error = $3, dead_lettered_at = now()
               WHERE id = $1`,
              [event.id, nextAttempts, message],
            );
            this.logger.error(
              `Outbox ${event.event_id} (${event.event_type}) agotó reintentos y quedó en dead-letter: ${message}`,
            );
          } else {
            const backoffSeconds = Math.min(5 * 2 ** (nextAttempts - 1), 300);
            await queryRunner.query(
              `UPDATE outbox_events
               SET attempts = $2,
                   last_error = $3,
                   next_attempt_at = now() + ($4 || ' seconds')::interval
               WHERE id = $1`,
              [event.id, nextAttempts, message, backoffSeconds],
            );
            this.logger.warn(
              `Outbox ${event.event_id} (${event.event_type}) falló; reintento ${nextAttempts}/${MAX_ATTEMPTS} en ${backoffSeconds}s: ${message}`,
            );
          }
        }
      }

      await queryRunner.commitTransaction();
      return pending.length;
    } catch (error) {
      if (started) await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
