import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { BranchImportParser } from './branch-import.parser.js';

const parser = new BranchImportParser();

function csvFile(content: string, name = 'sedes.csv') {
  return { buffer: Buffer.from(content, 'utf-8'), originalname: name };
}

describe('BranchImportParser', () => {
  it('parsea CSV con encabezados en español y comillas', async () => {
    const rows = await parser.parse(
      csvFile('nombre,ciudad,direccion\n"Sede, Norte",Medellín,"Calle 1, #2"\nSede Sur,Bogotá,\n'),
    );

    expect(rows).toEqual([
      { name: 'Sede, Norte', city: 'Medellín', address: 'Calle 1, #2' },
      { name: 'Sede Sur', city: 'Bogotá' },
    ]);
  });

  it('rechaza archivos sin columna name', async () => {
    await expect(parser.parse(csvFile('ciudad\nMedellín\n'))).rejects.toThrow('name');
  });

  it('rechaza más de 500 filas', async () => {
    const header = 'name\n';
    const body = Array.from({ length: 501 }, (_, index) => `Sede ${index}`).join('\n');
    await expect(parser.parse(csvFile(header + body))).rejects.toThrow('500');
  });

  it('parsea XLSX', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sedes');
    sheet.addRow(['nombre', 'ciudad']);
    sheet.addRow(['Sede Norte', 'Medellín']);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const rows = await parser.parse({ buffer, originalname: 'sedes.xlsx' });
    expect(rows).toEqual([{ name: 'Sede Norte', city: 'Medellín' }]);
  });
});
