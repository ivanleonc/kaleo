import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const INITIAL_DELAY_MS = 60 * 60 * 1000;

@Injectable()
export class JobsRetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsRetentionService.name);
  private timer?: NodeJS.Timeout;
  private initial?: NodeJS.Timeout;

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    @Optional() @InjectDataSource('auth') private readonly authDataSource?: DataSource,
  ) {}

  private get db(): DataSource {
    return this.authDataSource ?? this.dataSource;
  }

  onModuleInit(): void {
    this.initial = setTimeout(() => void this.runCleanup(), INITIAL_DELAY_MS);
    this.initial.unref?.();
    this.timer = setInterval(() => void this.runCleanup(), CHECK_INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.initial) clearTimeout(this.initial);
    if (this.timer) clearInterval(this.timer);
  }

  async runCleanup(): Promise<{ operations: number; jobs: number }> {
    const operationDays = this.numberFromEnv('OPERATIONS_RETENTION_DAYS', 7);
    const jobDays = this.numberFromEnv('JOBS_RETENTION_DAYS', 30);

    const operations = await this.db.query(
      `DELETE FROM operations
       WHERE status IN ('ready', 'failed')
         AND completed_at < now() - ($1 || ' days')::interval`,
      [operationDays],
    );

    const jobs = await this.db.query(
      `DELETE FROM jobs
       WHERE status IN ('completed', 'dead_letter')
         AND updated_at < now() - ($1 || ' days')::interval`,
      [jobDays],
    );

    const result = {
      operations: operations.rowCount ?? 0,
      jobs: jobs.rowCount ?? 0,
    };
    if (result.operations > 0 || result.jobs > 0) {
      this.logger.log(
        `Retención: ${result.operations} operaciones y ${result.jobs} jobs eliminados`,
      );
    }
    return result;
  }

  private numberFromEnv(name: string, fallback: number): number {
    const value = Number(this.config.get<string>(name) ?? fallback);
    return Number.isFinite(value) && value >= 1 ? Math.floor(value) : fallback;
  }
}
