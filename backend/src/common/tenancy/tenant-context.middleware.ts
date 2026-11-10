import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { TenantContextService } from './tenant-context.service.js';

/**
 * Crea el almacén de contexto para cada request. Debe ejecutarse después del
 * RequestLoggerMiddleware (que asigna x-request-id) y antes de los guards.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly tenantContext: TenantContextService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const requestId =
      (req.headers['x-request-id'] as string | undefined)?.trim() || randomUUID();
    req.headers['x-request-id'] = requestId;

    this.tenantContext.run({ requestId, isSuperAdmin: false }, () => next());
  }
}
