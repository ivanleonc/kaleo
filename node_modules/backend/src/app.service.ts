import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface HealthStatus {
  status: 'ok' | 'error';
  database: 'up' | 'down';
  version: string;
  uptimeSeconds: number;
}

function healthTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    const timer = setTimeout(() => reject(new Error(`health check timeout (${ms}ms)`)), ms);
    timer.unref?.();
  });
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
      // Timeout propio además del pool: el health check del hosting debe
      // fallar rápido (503) y nunca colgar el deploy esperando a la BD.
      await Promise.race([this.dataSource.query('SELECT 1'), healthTimeout(5000)]);
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
