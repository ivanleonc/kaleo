export interface CompanySettings {
  companyId: string;
  currencyCode: string;
  locale: string;
  settings: Record<string, unknown>;
  updatedAt: string;
}
