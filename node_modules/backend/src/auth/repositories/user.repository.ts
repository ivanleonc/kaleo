import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { buildDynamicUpdate } from '../../common/utils/sql.helper.js';

@Injectable()
export class UserRepository {
  constructor(private dataSource: DataSource) {}

  async findByEmail(email: string) {
    const result = await this.dataSource.query(
      `SELECT id, email, name, password_hash, must_change_password, email_verified,
              failed_login_attempts, locked_until, password_changed_at,
              phone, avatar_url, position, document_type, document_number,
              timezone, locale, pending_email
       FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email],
    );
    return result[0];
  }

  async findById(userId: string) {
    const result = await this.dataSource.query(
      `SELECT id, email, name, must_change_password, email_verified, password_changed_at,
              phone, avatar_url, position, document_type, document_number,
              timezone, locale, pending_email, locked_until
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId],
    );
    return result[0] || null;
  }



  async create(email: string, passwordHash: string, name?: string) {
    const result = await this.dataSource.query(
      `INSERT INTO users (email, password_hash, name, must_change_password) 
       VALUES ($1, $2, $3, FALSE) 
       RETURNING id, email, name, must_change_password`,
      [email, passwordHash, name || null],
    );
    return result[0];
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE users SET password_hash = $1, password_changed_at = NOW() WHERE id = $2`,
      [newPasswordHash, userId],
    );
  }

  async setMustChangePassword(userId: string, value: boolean): Promise<void> {
    await this.dataSource.query(
      `UPDATE users SET must_change_password = $1 WHERE id = $2`,
      [value, userId],
    );
  }

  async updateTemporaryPassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE users SET password_hash = $1, must_change_password = FALSE, password_changed_at = NOW() WHERE id = $2`,
      [newPasswordHash, userId],
    );
  }

  async incrementFailedLoginAttempts(userId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = $1`,
      [userId],
    );
  }

  async lockAccount(userId: string, lockMinutes: number = 15): Promise<void> {
    await this.dataSource.query(
      `UPDATE users SET locked_until = NOW() + ($2 || ' minutes')::interval WHERE id = $1`,
      [userId, String(lockMinutes)],
    );
  }

  async resetFailedLoginAttempts(userId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1`,
      [userId],
    );
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
      [userId],
    );
  }

  async setEmailVerified(userId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE users SET email_verified = TRUE, email_verification_token = NULL WHERE id = $1`,
      [userId],
    );
  }

  async setEmailVerificationToken(userId: string, token: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE users SET email_verification_token = $1 WHERE id = $2`,
      [token, userId],
    );
  }

  async findByVerificationToken(token: string) {
    const result = await this.dataSource.query(
      `SELECT id, email, name, pending_email, email_verification_expires_at FROM users
       WHERE email_verification_token = $1 AND deleted_at IS NULL`,
      [token],
    );
    return result[0] || null;
  }

  async requestEmailChange(userId: string, pendingEmail: string, token: string): Promise<void> {
    // NOTE: migration 015 must add column email_verification_expires_at (TIMESTAMPTZ) to users table
    await this.dataSource.query(
      `UPDATE users SET pending_email = $1, email_verification_token = $2,
              email_verification_expires_at = NOW() + INTERVAL '24 hours' WHERE id = $3`,
      [pendingEmail, token, userId],
    );
  }

  async confirmEmailChange(userId: string, newEmail: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE users SET email = $1, pending_email = NULL,
              email_verified = TRUE, email_verification_token = NULL
       WHERE id = $2`,
      [newEmail, userId],
    );
  }

  async clearPendingEmail(userId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE users SET pending_email = NULL, email_verification_token = NULL,
              email_verification_expires_at = NULL WHERE id = $1`,
      [userId],
    );
  }

  async updateProfile(userId: string, data: {
    name?: string; email?: string; phone?: string; avatar_url?: string;
    position?: string; document_type?: string; document_number?: string;
    timezone?: string; locale?: string;
  }): Promise<void> {
    const { updates, values, startIndex } = buildDynamicUpdate(
      data,
      ['name', 'email', 'phone', 'avatar_url', 'position', 'document_type', 'document_number', 'timezone', 'locale'],
      { nullEmptyStrings: true, extraSet: ['updated_at = NOW()'] },
    );

    if (updates.length === 1) return;

    values.push(userId);
    await this.dataSource.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${startIndex}`,
      values,
    );
  }
}
