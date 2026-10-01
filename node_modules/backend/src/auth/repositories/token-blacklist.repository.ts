import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { sha256 } from '../../common/utils/crypto.js';

@Injectable()
export class TokenBlacklistRepository {
  constructor(private dataSource: DataSource) {}

  async add(token: string, expiresAt: Date) {
    const tokenHash = sha256(token);
    await this.dataSource.query(
      `INSERT INTO token_blacklist (token_hash, expires_at) 
       VALUES ($1, $2) 
       ON CONFLICT (token_hash) DO NOTHING`,
      [tokenHash, expiresAt],
    );
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const tokenHash = sha256(token);
    const result = await this.dataSource.query(
      `SELECT 1 FROM token_blacklist WHERE token_hash = $1`,
      [tokenHash],
    );
    return result.length > 0;
  }

  async cleanup() {
    await this.dataSource.query(
      `DELETE FROM token_blacklist WHERE expires_at < NOW()`,
    );
  }
}
