import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, from, mergeMap, of, throwError } from 'rxjs';
import { IdempotencyService } from './idempotency.service.js';
import { TenantContextService } from '../../common/tenancy/tenant-context.service.js';

const KEY_RE = /^[A-Za-z0-9._:-]{8,128}$/;

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly idempotency: IdempotencyService,
    private readonly tenantContext: TenantContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const key = request.headers?.['idempotency-key'];

    if (request.method !== 'POST' || typeof key !== 'string' || !key.trim()) {
      return next.handle();
    }
    if (!KEY_RE.test(key.trim())) {
      throw new BadRequestException(
        'Idempotency-Key inválida: usa 8-128 caracteres alfanuméricos, ".", "_", ":" o "-"',
      );
    }

    const contentType = String(request.headers?.['content-type'] ?? '');
    if (contentType.includes('multipart/form-data')) {
      return next.handle();
    }

    const store = this.tenantContext.get();
    const companyId = store?.companyId;
    const userId = store?.userId;
    if (!companyId || !userId) return next.handle();

    const scope = `${request.method} ${request.url.split('?')[0]}`;

    return from(
      this.idempotency.begin({
        companyId,
        userId,
        key: key.trim(),
        scope,
        requestBody: request.body ?? {},
      }),
    ).pipe(
      mergeMap((result) => {
        if (result.kind === 'conflict') {
          throw new ConflictException({
            code: 'IDEMPOTENCY_KEY_REUSED',
            message: 'La Idempotency-Key ya fue usada con un body distinto',
          });
        }
        if (result.kind === 'processing') {
          throw new ConflictException({
            code: 'IDEMPOTENCY_IN_PROGRESS',
            message: 'La operación con esta Idempotency-Key está en proceso',
          });
        }
        if (result.kind === 'replay') {
          response.setHeader('Idempotency-Replayed', 'true');
          response.setHeader('Idempotency-Key', key.trim());
          response.status(result.record.response_status ?? 201);
          return of(result.record.response_body);
        }

        return next.handle().pipe(
          mergeMap(async (body) => {
            const status =
              response.statusCode && response.statusCode !== 200
                ? response.statusCode
                : 201;
            await this.idempotency.complete(result.id, status, body);
            response.setHeader('Idempotency-Key', key.trim());
            return body;
          }),
          catchError((error) =>
            from(this.idempotency.fail(result.id)).pipe(
              mergeMap(() => throwError(() => error)),
            ),
          ),
        );
      }),
    );
  }
}
