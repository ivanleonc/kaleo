import { Injectable, Logger, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, QueryRunner } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { TenantContextService } from '../../common/tenancy/tenant-context.service.js';
import type { JobHandler, JobInput, JobRow } from './jobs.types.js';

const DEFAULT_MAX_ATTEMPTS = 5;
const STALE_LOCK_MINUTES = 10;
const JOB_TIMEOUT_MS = 60_000;

type QueryExecutor = { query(sql: string, parameters?: any[]): Promise<any> };

/**
 * Cola de jobs genérica sobre PostgreSQL.
 *
 * - `enqueue` puede unirse a la transacción de negocio.
 * - `runPending` reclama jobs con `FOR UPDATE SKIP LOCKED`.
 * - Reintentos con backoff exponencial y dead-letter.
 * - Los jobs `running` con lock viejo se devuelven a `pending`.
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly handlers = new Map<string, JobHandler>();
  private readonly workerId = randomUUID();

  constructor(
    private readonly dataSource: DataSource,
    @Optional() @InjectDataSource('auth') private readonly authDataSource?: DataSource,
    @Optional() private readonly tenantContext?: TenantContextService,
  ) {}

  private get privilegedDataSource(): DataSource {
    return this.authDataSource ?? this.dataSource;
  }

  registerHandler(queue: string, handler: JobHandler): void {
    this.handlers.set(queue, handler);
  }

  async enqueue(input: JobInput, queryRunner?: QueryRunner): Promise<string> {
    const executor: QueryExecutor = queryRunner ?? this.privilegedDataSource;
    const inserted = await executor.query(
      `INSERT INTO jobs (company_id, queue, payload, run_at, max_attempts)
       VALUES ($1, $2, $3::jsonb, COALESCE($4, now()), $5)
       RETURNING id`,
      [
        input.companyId,
        input.queue,
        JSON.stringify(input.payload ?? {}),
        input.runAt ?? null,
        Math.max(1, input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS),
      ],
    );
    const row = Array.isArray(inserted?.[0]) ? inserted[0][0] : inserted[0];
    return row!.id as string;
  }

  async runPending(limit = 10): Promise<number> {
    const db = this.privilegedDataSource;

    await db.query(
      `UPDATE jobs
       SET status = 'pending', locked_at = NULL, locked_by = NULL,
           last_error = COALESCE(last_error, 'lock expirado')
       WHERE status = 'running'
         AND locked_at < now() - ($1 || ' minutes')::interval`,
      [STALE_LOCK_MINUTES],
    );

    const rawClaimed = await db.query(
      `WITH candidate AS (
         SELECT id FROM jobs
         WHERE status = 'pending' AND run_at <= now()
         ORDER BY run_at
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       UPDATE jobs j
       SET status = 'running',
           locked_at = now(),
           locked_by = $2,
           attempts = attempts + 1
       FROM candidate c
       WHERE j.id = c.id
       RETURNING j.id, j.company_id, j.queue, j.payload, j.status, j.run_at,
                 j.attempts, j.max_attempts, j.locked_at, j.locked_by,
                 j.last_error, j.completed_at, j.created_at, j.updated_at`,
      [limit, this.workerId],
    );
    // TypeORM devuelve [rows, rowCount] para UPDATE ... RETURNING ejecutado
    // directamente sobre el DataSource; dentro de un QueryRunner devuelve rows.
    const claimed = (Array.isArray(rawClaimed?.[0]) ? rawClaimed[0] : rawClaimed) as JobRow[];

    for (const job of claimed) {
      const handler = this.handlers.get(job.queue);
      try {
        if (!handler) {
          throw new Error(`No hay handler para la cola "${job.queue}"`);
        }
        this.logger.log(`Job ${job.id} (${job.queue}) start`);
        const execute = () => handler(job);
        if (this.tenantContext) {
          const userId =
            typeof job.payload.userId === 'string' ? job.payload.userId : undefined;
          await this.withTimeout(
            this.tenantContext.run(
              {
                requestId: `job:${job.id}`,
                companyId: job.company_id,
                userId,
                isSuperAdmin: false,
              },
              execute,
            ),
            job.id,
          );
        } else {
          await this.withTimeout(execute(), job.id);
        }
        await db.query(
          `UPDATE jobs
           SET status = 'completed', completed_at = now(),
               locked_at = NULL, locked_by = NULL, last_error = NULL
           WHERE id = $1`,
          [job.id],
        );
        this.logger.log(`Job ${job.id} (${job.queue}) completed`);
      } catch (error) {
        const message = (error as Error).message.slice(0, 1000);
        if (job.attempts >= job.max_attempts) {
          await db.query(
            `UPDATE jobs
             SET status = 'dead_letter', last_error = $2,
                 locked_at = NULL, locked_by = NULL
             WHERE id = $1`,
            [job.id, message],
          );
          this.logger.error(
            `Job ${job.id} (${job.queue}) agotó intentos y quedó en dead-letter: ${message}`,
          );
        } else {
          const backoffSeconds = Math.min(5 * 2 ** (job.attempts - 1), 300);
          await db.query(
            `UPDATE jobs
             SET status = 'pending',
                 run_at = now() + ($2 || ' seconds')::interval,
                 last_error = $3,
                 locked_at = NULL, locked_by = NULL
             WHERE id = $1`,
            [job.id, backoffSeconds, message],
          );
          this.logger.warn(
            `Job ${job.id} (${job.queue}) falló; reintento ${job.attempts}/${job.max_attempts} en ${backoffSeconds}s: ${message}`,
          );
        }
      }
    }

    return claimed.length;
  }

  private async withTimeout<T>(promise: Promise<T>, jobId: string): Promise<T> {
    let timer: NodeJS.Timeout | undefined;

    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`Job ${jobId} excedió ${JOB_TIMEOUT_MS / 1000}s`)),
            JOB_TIMEOUT_MS,
          );
          timer.unref?.();
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
