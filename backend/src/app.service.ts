import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface HealthStatus {
  status: 'ok' | 'error';
  database: 'up' | 'down';
  version: string;
  uptimeSeconds: number;
}

@Injectable()
export class AppService {
  private readonly startedAt = Date.now();

  constructor(private readonly dataSource: DataSource) {}

  getHello(): string {
    return 'Hello World!';
  }

  /** Salud real: responde ok solo si la base de datos contesta. */
  async getHealth(): Promise<HealthStatus> {
    let database: 'up' | 'down' = 'down';
    try {
      await this.dataSource.query('SELECT 1');
      database = 'up';
    } catch {
      database = 'down';
    }
    return {
      status: database === 'up' ? 'ok' : 'error',
      database,
      version: process.env.npm_package_version ?? 'unknown',
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
    };
  }
}
