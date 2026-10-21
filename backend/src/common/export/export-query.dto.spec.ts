import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ExportQueryDto } from './export-query.dto.js';

async function build(query: Record<string, unknown>) {
  const dto = plainToInstance(ExportQueryDto, query);
  const errors = await validate(dto);
  return { dto, errors };
}

describe('ExportQueryDto', () => {
  it('acepta las columnas separadas por coma', async () => {
    const { dto, errors } = await build({ columns: 'name,email' });

    expect(errors).toHaveLength(0);
    expect(dto.columns).toEqual(['name', 'email']);
  });

  it('ignora el valor vacío de columns', async () => {
    const { dto, errors } = await build({ columns: '' });

    expect(errors).toHaveLength(0);
    expect(dto.columns).toBeUndefined();
  });

  it('acepta una lista ya separada', async () => {
    const { dto, errors } = await build({ columns: ['name', 'email'] });

    expect(errors).toHaveLength(0);
    expect(dto.columns).toEqual(['name', 'email']);
  });

  it('rechaza un formato desconocido', async () => {
    const { errors } = await build({ format: 'pdf' });

    expect(errors.length).toBeGreaterThan(0);
  });

  it('acepta csv y xlsx', async () => {
    for (const format of ['csv', 'xlsx']) {
      const { errors } = await build({ format });
      expect(errors).toHaveLength(0);
    }
  });
});
