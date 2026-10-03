import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompanyRepository } from './company.repository.js';

/**
 * getAllCompanies es solo para super-admin: valida que el SQL no filtre
 * por usuario y que incluya el conteo de miembros.
 */
describe('CompanyRepository.getAllCompanies', () => {
  let calls: Array<{ sql: string; params: any[] }>;
  let repository: CompanyRepository;

  beforeEach(() => {
    calls = [];
    const dataSource = {
      query: vi.fn(async (sql: string, params: any[] = []) => {
        calls.push({ sql, params });
        return [{ id: 'c-1', name: 'Acme', member_count: 3 }];
      }),
    };
    repository = new CompanyRepository(dataSource as any);
  });

  it('lista todas sin filtro por usuario y con conteo de miembros', async () => {
    const result = await repository.getAllCompanies();

    expect(result).toEqual([{ id: 'c-1', name: 'Acme', member_count: 3 }]);
    const { sql, params } = calls[0];
    // Sin filtro por usuario: ningún WHERE sobre uc.user_id con parámetro.
    expect(sql).not.toMatch(/uc\.user_id\s*=\s*\$/);
    expect(sql).toContain('COUNT(DISTINCT uc.user_id)');
    expect(sql).toContain('c.deleted_at IS NULL');
    expect(params).toEqual([]);
  });
});
