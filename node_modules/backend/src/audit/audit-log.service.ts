import { Injectable, Logger, StreamableFile } from '@nestjs/common';
import { AuditLogRepository } from './audit-log.repository.js';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private auditLogRepository: AuditLogRepository) {}

  async log(data: {
    userId?: string;
    companyId?: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
    responseStatus?: number;
    responseData?: any;
    durationMs?: number;
  }) {
    if (!data.companyId) {
      this.logger.debug(`Skipping audit log for action "${data.action}" — no companyId provided`);
      return;
    }

    try {
      await this.auditLogRepository.log({
        ...data,
        companyId: data.companyId,
      });
    } catch (error: any) {
      this.logger.error(`Failed to write audit log: ${error.message}`);
    }
  }

  async findFiltered(params: {
    companyId: string;
    entityType?: string;
    action?: string;
    userId?: string;
    from?: string;
    to?: string;
    limit: number;
    cursor?: string;
  }) {
    return this.auditLogRepository.findFiltered(params);
  }

  async getEntityTypes(companyId: string) {
    return this.auditLogRepository.getEntityTypes(companyId);
  }

  async findByUser(userId: string, limit?: number) {
    return this.auditLogRepository.findByUser(userId, limit);
  }

  async findByCompany(companyId: string, limit?: number) {
    return this.auditLogRepository.findByCompany(companyId, limit);
  }

  async exportCsv(params: {
    companyId: string;
    entityType?: string;
    action?: string;
    userId?: string;
    from?: string;
    to?: string;
  }): Promise<StreamableFile> {
    const rows = await this.auditLogRepository.findForExport(params);

    const headers = [
      'Fecha', 'Usuario', 'Email', 'Accion', 'Entidad', 'ID Entidad',
      'Valores Anteriores', 'Valores Nuevos', 'IP', 'Navegador',
    ];

    const csvRows = rows.map((row: any) => [
      new Date(row.created_at).toLocaleString('es-ES'),
      row.user_name || 'N/A',
      row.user_email || 'N/A',
      row.action,
      row.entity_type,
      row.entity_id,
      row.old_values ? JSON.stringify(row.old_values) : '',
      row.new_values ? JSON.stringify(row.new_values) : '',
      row.ip_address || '',
      this.parseUserAgent(row.user_agent),
    ]);

    const csvContent = [
      headers.join(','),
      ...csvRows.map((row: string[]) =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const buffer = Buffer.from('\uFEFF' + csvContent, 'utf-8');

    return new StreamableFile(buffer, {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="auditoria_${new Date().toISOString().split('T')[0]}.csv"`,
    });
  }

  private parseUserAgent(ua?: string): string {
    if (!ua) return 'Desconocido';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Otro';
  }
}
