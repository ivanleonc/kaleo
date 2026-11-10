import { lastValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { IdempotencyInterceptor } from './idempotency.interceptor.js';
import { TenantContextService } from '../../common/tenancy/tenant-context.service.js';

function contextFor(request: any, response: any) {
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as any;
}

function createResponse() {
  return {
    statusCode: 200,
    status: vi.fn(function (this: any, code: number) {
      this.statusCode = code;
      return this;
    }),
    setHeader: vi.fn(),
  };
}

describe('IdempotencyInterceptor', () => {
  it('reproduce la respuesta guardada sin ejecutar el handler', async () => {
    const idempotency = {
      begin: vi.fn(async () => ({
        kind: 'replay',
        record: {
          id: 'idem-1',
          request_hash: 'h',
          status: 'completed',
          response_status: 201,
          response_body: { success: true, data: { id: 'item-1' } },
        },
      })),
      complete: vi.fn(),
      fail: vi.fn(),
    } as any;
    const tenant = new TenantContextService();
    const interceptor = new IdempotencyInterceptor(idempotency, tenant);
    const request = {
      method: 'POST',
      url: '/api/items',
      body: { name: 'x' },
      headers: { 'idempotency-key': 'idem-key-123', 'content-type': 'application/json' },
    };
    const response = createResponse();
    const next = { handle: vi.fn(() => of({ shouldNotRun: true })) };

    const result = await tenant.run(
      { requestId: 'r', companyId: 'c', userId: 'u', isSuperAdmin: false },
      () => lastValueFrom(interceptor.intercept(contextFor(request, response), next)),
    );

    expect(result).toEqual({ success: true, data: { id: 'item-1' } });
    expect(next.handle).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.setHeader).toHaveBeenCalledWith('Idempotency-Replayed', 'true');
  });

  it('guarda la respuesta después de ejecutar el handler', async () => {
    const idempotency = {
      begin: vi.fn(async () => ({ kind: 'new', id: 'idem-1' })),
      complete: vi.fn(async () => {}),
      fail: vi.fn(),
    } as any;
    const tenant = new TenantContextService();
    const interceptor = new IdempotencyInterceptor(idempotency, tenant);
    const request = {
      method: 'POST',
      url: '/api/items',
      body: { name: 'x' },
      headers: { 'idempotency-key': 'idem-key-123', 'content-type': 'application/json' },
    };
    const response = createResponse();

    const result = await tenant.run(
      { requestId: 'r', companyId: 'c', userId: 'u', isSuperAdmin: false },
      () =>
        lastValueFrom(
          interceptor.intercept(contextFor(request, response), {
            handle: () => of({ success: true }),
          }),
        ),
    );

    expect(result).toEqual({ success: true });
    expect(idempotency.complete).toHaveBeenCalledWith('idem-1', 201, { success: true });
  });
});
