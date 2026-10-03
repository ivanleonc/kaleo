import { STORAGE_KEYS } from './storage-keys.js';

const ACCESS_TOKEN_KEY = STORAGE_KEYS.accessToken;
const REFRESH_TOKEN_KEY = STORAGE_KEYS.refreshToken;

export const TokenService = {
  getToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  saveTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  saveToken(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },

  destroyTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  destroyToken(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  },
};
