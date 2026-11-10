import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContextStore {
  requestId: string;
  userId?: string;
  companyId?: string;
  isSuperAdmin: boolean;
}

/**
 * Contexto de la request actual: tenant, usuario y request-id.
 *
 * Se inicializa en `TenantContextMiddleware` y se completa en
 * `CompanyAccessGuard` cuando llega `x-company-id`.
 *
 * Los repositorios nuevos deben usar `requireCompanyId()` en lugar de confiar
 * en un parámetro opcional. Los repositorios existentes siguen recibiendo
 * `companyId` explícito hasta completar la migración a RLS.
 */
@Injectable()
export class TenantContextService {
  private readonly als = new AsyncLocalStorage<TenantContextStore>();

  run<T>(store: TenantContextStore, fn: () => T): T {
    return this.als.run(store, fn);
  }

  get(): TenantContextStore | undefined {
    return this.als.getStore();
  }

  setUser(userId: string, isSuperAdmin = false): void {
    const store = this.als.getStore();
    if (!store) return;
    store.userId = userId;
    store.isSuperAdmin = isSuperAdmin;
  }

  setCompany(companyId: string, userId?: string, isSuperAdmin = false): void {
    const store = this.als.getStore();
    if (!store) return;
    store.companyId = companyId;
    if (userId) store.userId = userId;
    store.isSuperAdmin = isSuperAdmin;
  }

  getCompanyId(): string | undefined {
    return this.als.getStore()?.companyId;
  }

  getUserId(): string | undefined {
    return this.als.getStore()?.userId;
  }

  requireCompanyId(): string {
    const companyId = this.als.getStore()?.companyId;
    if (!companyId) {
      throw new Error('TenantContext sin companyId: falta x-company-id o no se inicializó el contexto');
    }
    return companyId;
  }

  requireUserId(): string {
    const userId = this.als.getStore()?.userId;
    if (!userId) {
      throw new Error('TenantContext sin userId: no se inicializó el usuario autenticado');
    }
    return userId;
  }
}
