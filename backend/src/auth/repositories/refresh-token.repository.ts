import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { sha256 } from '../../common/utils/crypto.js';

export interface StoredRefreshToken {
  id: string;
  user_id: string;
  expires_at: Date;
  revoked: boolean;
  family_id: string;
}

export interface RefreshTokenMetadata {
  familyId?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class RefreshTokenRepository {
  constructor(@InjectDataSource('auth') private dataSource: DataSource) {}

  async create(
    userId: string,
    token: string,
    expiresAt: Date,
    metadata: RefreshTokenMetadata = {},
  ) {
    const tokenHash = sha256(token);
    const result = await this.dataSource.query(
      `INSERT INTO refresh_tokens
         (user_id, token_hash, expires_at, family_id, ip_address, user_agent, last_used_at)
       VALUES ($1, $2, $3, COALESCE($4::uuid, gen_random_uuid()), $5, $6, NOW())
       RETURNING id, user_id, expires_at, created_at, family_id`,
      [
        userId,
        tokenHash,
        expiresAt,
        metadata.familyId ?? null,
        metadata.ipAddress ?? null,
        metadata.userAgent ?? null,
      ],
    );
    return result[0];
  }

  /**
   * Busca el token aunque esté revocado: es lo que permite detectar reuso.
   */
  async findByHash(token: string): Promise<StoredRefreshToken | undefined> {
    const tokenHash = sha256(token);
    const result = await this.dataSource.query(
      `SELECT id, user_id, expires_at, revoked, family_id
       FROM refresh_tokens
       WHERE token_hash = $1`,
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

  async revokeFamily(familyId: string) {
    await this.dataSource.query(
      `UPDATE refresh_tokens SET revoked = TRUE
       WHERE family_id = $1 AND revoked = FALSE`,
      [familyId],
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
