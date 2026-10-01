import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class PasswordHistoryRepository {
  constructor(private dataSource: DataSource) {}

  async add(userId: string, passwordHash: string) {
    await this.dataSource.query(
      `INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)`,
      [userId, passwordHash],
    );
  }

  async getRecent(userId: string, limit: number = 3): Promise<string[]> {
    const result = await this.dataSource.query(
      `SELECT password_hash 
       FROM password_history 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit],
    );
    return result.map((r: any) => r.password_hash);
  }

  async cleanup(userId: string, keep: number = 10) {
    await this.dataSource.query(
      `DELETE FROM password_history 
       WHERE user_id = $1 
       AND id NOT IN (
         SELECT id FROM password_history 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2
       )`,
      [userId, keep],
    );
  }
}
