import { SetMetadata } from '@nestjs/common';

export const SKIP_PASSWORD_CHANGED_KEY = 'skipPasswordChanged';
export const SkipPasswordChanged = () => SetMetadata(SKIP_PASSWORD_CHANGED_KEY, true);
