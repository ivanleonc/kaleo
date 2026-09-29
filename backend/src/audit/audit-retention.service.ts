import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AuditRetentionService {
  private readonly logger = new Logger(AuditRetentionService.name);
  private readonly RETENTION_DAYS = 365;
  private readonly CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

  constructor(private dataSource: DataSource) {}

  onModuleInit() {
    this.logger.log(`Audit retention: logs older than ${this.RETENTION_DAYS} days will be cleaned`);
    setTimeout(() => {
      this.runCleanup().catch((error) => {
        this.logger.warn(`Initial retention cleanup skipped: ${error.message}`);
      });
    }, 60 * 60 * 1000);
    setInterval(() => {
      this.runCleanup().catch((error) => {
        this.logger.warn(`Scheduled retention cleanup failed: ${error.message}`);
      });
    }, this.CHECK_INTERVAL_MS);
  }

  private readonly BATCH_SIZE = 5000;

  async discoverPartitions(): Promise<string[]> {
    try {
      const rows = await this.dataSource.query(
        `SELECT tablename FROM pg_tables
         WHERE schemaname = 'public' AND tablename LIKE 'audit_logs\\_%' ESCAPE '\\'
         ORDER BY tablename`,
      );
      const found = rows.map((r: any) => r.tablename).filter((t: string) => t !== 'audit_logs');
      return found.length > 0 ? found : ['audit_logs_default'];
    } catch {
      return ['audit_logs_default'];
    }
  }

  async runCleanup() {
    const partitions = await this.discoverPartitions();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.RETENTION_DAYS);
    const cutoffStr = cutoff.toISOString();

    let totalDeleted = 0;
    for (const partitionName of partitions) {
      try {
        // Borrado por lotes: evita una transacción gigante (locks, bloat, timeouts)
        for (;;) {
          const result = await this.dataSource.query(
            `DELETE FROM ${partitionName} WHERE ctid IN (
               SELECT ctid FROM ${partitionName}
               WHERE created_at < $1
               LIMIT $2
             )`,
            [cutoffStr, this.BATCH_SIZE],
          );
          const count = result.rowCount || 0;
          totalDeleted += count;
          if (count < this.BATCH_SIZE) break;
        }
        this.logger.log(`Retention: cleaned ${partitionName}`);
      } catch (error: any) {
        // Partition might not exist yet, skip silently
        this.logger.debug(`Retention skipped ${partitionName}: ${error.message}`);
      }
    }

    if (totalDeleted > 0) {
      this.logger.log(`Retention cleanup complete: ${totalDeleted} total rows deleted`);
    }
  }
}
