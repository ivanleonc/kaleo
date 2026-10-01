import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { sha256 } from '../../common/utils/crypto.js';

@Injectable()
export class RefreshTokenRepository {
  constructor(private dataSource: DataSource) {}

  async create(userId: string, token: string, expiresAt: Date) {
    const tokenHash = sha256(token);
    const result = await this.dataSource.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) 
       VALUES ($1, $2, $3) 
       RETURNING id, user_id, expires_at, created_at`,
      [userId, tokenHash, expiresAt],
    );
    return result[0];
  }

  async findValid(token: string) {
    const tokenHash = sha256(token);
    const result = await this.dataSource.query(
      `SELECT id, user_id, expires_at 
       FROM refresh_tokens 
       WHERE token_hash = $1 AND revoked = FALSE AND expires_at > NOW()`,
      [tokenHash],
    );
    return result[0];
  }

  async revoke(token: string) {
    const tokenHash = sha256(token);
    await this.dataSource.query(
      `UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1`,
      [tokenHash],
    );
  }

  async revokeAllForUser(userId: string) {
    await this.dataSource.query(
      `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`,
      [userId],
    );
  }

  async cleanup() {
    await this.dataSource.query(
      `DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked = TRUE`,
    );
  }
}
