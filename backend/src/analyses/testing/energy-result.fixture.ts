export function createEnergyResult() {
  return {
    meta: {
      fileName: 'energia.xlsx',
      processedAt: '2026-01-31T12:00:00.000Z',
      rowsProcessed: 120,
      periodFrom: '2026-01-01',
      periodTo: '2026-01-31',
      source: 'api',
    },
    kpis: {
      totalClients: 100,
      totalConsumptionKwh: 50000,
      totalBilledCop: 25000000,
      nonTechnicalLossesKwh: 5000,
      nonTechnicalLossesPct: 10,
      detectedAnomalies: 4,
      averageConsumptionKwh: 500,
    },
    consumptionByPeriod: [
      { period: '2026-01', consumptionKwh: 50000, billedKwh: 45000 },
    ],
    lossesByZone: [
      { zone: 'Centro', lossesKwh: 2500, lossesPct: 5 },
    ],
    clientsBySegment: [
      { label: 'Residencial', value: 70 },
    ],
    lossTrend: [
      { period: '2026-01', lossesPct: 10 },
    ],
    criticalZones: [
      {
        id: 'zone-1',
        zone: 'Centro',
        municipality: 'Bogotá',
        clients: 50,
        consumptionKwh: 20000,
        lossesKwh: 2000,
        lossesPct: 10,
        status: 'critical',
      },
    ],
  };
}
