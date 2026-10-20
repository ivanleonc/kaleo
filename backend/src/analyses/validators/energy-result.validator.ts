import { BadRequestException } from '@nestjs/common';
import type {
  EnergyAnalysisResult,
  EnergyClientSegment,
  EnergyConsumptionPoint,
  EnergyCriticalZone,
  EnergyKpis,
  EnergyLossPoint,
  EnergyMeta,
  EnergyZoneLoss,
  EnergyZoneStatus,
} from '../types/analysis.types.js';

const ENERGY_STATUSES: ReadonlySet<string> = new Set(['critical', 'warning', 'normal']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalid(path: string, expected: string): never {
  throw new BadRequestException(`El resultado de energía es inválido: ${path} ${expected}`);
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) invalid(path, 'debe ser un objeto');
  return value;
}

function requireString(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && value.trim().length === 0)) {
    invalid(path, 'debe ser un texto no vacío');
  }
  return value;
}

function requireNumber(value: unknown, path: string, min = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min) {
    invalid(path, `debe ser un número mayor o igual a ${min}`);
  }
  return value;
}

function requireInteger(value: unknown, path: string, min = 0): number {
  const number = requireNumber(value, path, min);
  if (!Number.isInteger(number)) invalid(path, 'debe ser un entero');
  return number;
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) invalid(path, 'debe ser un array');
  return value;
}

function parseMeta(value: unknown): EnergyMeta {
  const meta = requireRecord(value, 'meta');
  const source = requireString(meta.source, 'meta.source');
  if (source !== 'api' && source !== 'mock') {
    invalid('meta.source', 'debe ser "api" o "mock"');
  }

  return {
    fileName: requireString(meta.fileName, 'meta.fileName'),
    processedAt: requireString(meta.processedAt, 'meta.processedAt'),
    rowsProcessed: requireInteger(meta.rowsProcessed, 'meta.rowsProcessed'),
    periodFrom: requireString(meta.periodFrom, 'meta.periodFrom'),
    periodTo: requireString(meta.periodTo, 'meta.periodTo'),
    source,
  };
}

function parseKpis(value: unknown): EnergyKpis {
  const kpis = requireRecord(value, 'kpis');
  return {
    totalClients: requireNumber(kpis.totalClients, 'kpis.totalClients'),
    totalConsumptionKwh: requireNumber(kpis.totalConsumptionKwh, 'kpis.totalConsumptionKwh'),
    totalBilledCop: requireNumber(kpis.totalBilledCop, 'kpis.totalBilledCop'),
    nonTechnicalLossesKwh: requireNumber(kpis.nonTechnicalLossesKwh, 'kpis.nonTechnicalLossesKwh'),
    nonTechnicalLossesPct: requireNumber(kpis.nonTechnicalLossesPct, 'kpis.nonTechnicalLossesPct'),
    detectedAnomalies: requireNumber(kpis.detectedAnomalies, 'kpis.detectedAnomalies'),
    averageConsumptionKwh: requireNumber(kpis.averageConsumptionKwh, 'kpis.averageConsumptionKwh'),
  };
}

function parseConsumptionPoint(value: unknown, path: string): EnergyConsumptionPoint {
  const item = requireRecord(value, path);
  return {
    period: requireString(item.period, `${path}.period`),
    consumptionKwh: requireNumber(item.consumptionKwh, `${path}.consumptionKwh`),
    billedKwh: requireNumber(item.billedKwh, `${path}.billedKwh`),
  };
}

function parseZoneLoss(value: unknown, path: string): EnergyZoneLoss {
  const item = requireRecord(value, path);
  return {
    zone: requireString(item.zone, `${path}.zone`),
    lossesKwh: requireNumber(item.lossesKwh, `${path}.lossesKwh`),
    lossesPct: requireNumber(item.lossesPct, `${path}.lossesPct`),
  };
}

function parseClientSegment(value: unknown, path: string): EnergyClientSegment {
  const item = requireRecord(value, path);
  return {
    label: requireString(item.label, `${path}.label`),
    value: requireNumber(item.value, `${path}.value`),
  };
}

function parseLossPoint(value: unknown, path: string): EnergyLossPoint {
  const item = requireRecord(value, path);
  return {
    period: requireString(item.period, `${path}.period`),
    lossesPct: requireNumber(item.lossesPct, `${path}.lossesPct`),
  };
}

function parseCriticalZone(value: unknown, path: string): EnergyCriticalZone {
  const item = requireRecord(value, path);
  const status = requireString(item.status, `${path}.status`);
  if (!ENERGY_STATUSES.has(status)) {
    invalid(`${path}.status`, 'debe ser "critical", "warning" o "normal"');
  }

  return {
    id: requireString(item.id, `${path}.id`),
    zone: requireString(item.zone, `${path}.zone`),
    municipality: requireString(item.municipality, `${path}.municipality`, true),
    clients: requireNumber(item.clients, `${path}.clients`),
    consumptionKwh: requireNumber(item.consumptionKwh, `${path}.consumptionKwh`),
    lossesKwh: requireNumber(item.lossesKwh, `${path}.lossesKwh`),
    lossesPct: requireNumber(item.lossesPct, `${path}.lossesPct`),
    status: status as EnergyZoneStatus,
  };
}

function parseArray<T>(value: unknown, path: string, parser: (item: unknown, path: string) => T): T[] {
  return requireArray(value, path).map((item, index) => parser(item, `${path}[${index}]`));
}

export function parseEnergyResult(value: unknown): EnergyAnalysisResult {
  const result = requireRecord(value, 'result');
  return {
    meta: parseMeta(result.meta),
    kpis: parseKpis(result.kpis),
    consumptionByPeriod: parseArray(result.consumptionByPeriod, 'consumptionByPeriod', parseConsumptionPoint),
    lossesByZone: parseArray(result.lossesByZone, 'lossesByZone', parseZoneLoss),
    clientsBySegment: parseArray(result.clientsBySegment, 'clientsBySegment', parseClientSegment),
    lossTrend: parseArray(result.lossTrend, 'lossTrend', parseLossPoint),
    criticalZones: parseArray(result.criticalZones, 'criticalZones', parseCriticalZone),
  };
}
