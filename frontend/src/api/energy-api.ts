import axios from 'axios';
import { enrichAxiosError } from '@/api/axios';

export const ENERGY_API_URL = (
  import.meta.env.VITE_ENERGY_API_URL as string | undefined
)?.trim() ?? '';

export const ENERGY_UPLOAD_PATH =
  (import.meta.env.VITE_ENERGY_UPLOAD_PATH as string | undefined)?.trim() ||
  '/energy/upload/';

export const IS_ENERGY_MOCK = ENERGY_API_URL.length === 0;

export const energyClient = axios.create({
  baseURL: ENERGY_API_URL || 'http://localhost:8000/api',
  timeout: 120_000,
  headers: {
    Accept: 'application/json',
  },
});

energyClient.interceptors.response.use(
  (response) => response,
  (error) => {
    enrichAxiosError(error);
    return Promise.reject(error);
  },
);
