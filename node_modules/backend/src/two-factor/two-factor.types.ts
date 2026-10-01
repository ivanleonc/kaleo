/**
 * 2FA Module - Preparation scaffolding
 * NOT YET IMPLEMENTED - Types and interfaces for future use
 */

export interface TwoFactorSecret {
  secret: string;
  otpauthUrl: string;
}

export interface TwoFactorSetup {
  userId: string;
  secret: string;
  backupCodes: string[];
  enabledAt: Date | null;
}

export interface VerifyTwoFactorDto {
  code: string;
  token: string;
}

export interface TwoFactorStatus {
  enabled: boolean;
  backupCodesRemaining: number;
}
