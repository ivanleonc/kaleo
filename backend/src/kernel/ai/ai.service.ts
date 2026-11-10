import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogService } from '../../audit/audit-log.service.js';
import { AiRepository } from './ai.repository.js';
import type { AiActionRow, AiRunRow, AiToolRow } from './ai.types.js';

export interface AiRunResult {
  run: AiRunRow;
  action: AiActionRow | null;
}

@Injectable()
export class AiService {
  constructor(
    private readonly repository: AiRepository,
    private readonly audit: AuditLogService,
  ) {}

  async listTools(): Promise<AiToolRow[]> {
    return this.repository.listTools();
  }

  async createRun(
    companyId: string,
    userId: string,
    toolCode: string,
    input: Record<string, unknown> = {},
  ): Promise<AiRunResult> {
    const tool = await this.repository.findTool(toolCode);
    if (!tool) throw new NotFoundException('Herramienta de IA no encontrada');

    const requiresHitl =
      tool.requires_confirmation ||
      tool.risk === 'business_write' ||
      tool.risk === 'external';

    const run = await this.repository.createRun(
      companyId,
      userId,
      tool.code,
      input,
      requiresHitl ? 'awaiting_confirmation' : 'running',
    );

    if (requiresHitl) {
      const action = await this.repository.createAction(
        companyId,
        run.id,
        tool.code,
        userId,
        input,
      );
      return { run, action };
    }

    try {
      const output = await this.executeTool(tool, run, companyId, userId, input);
      await this.repository.updateRun(run.id, 'completed', output, null);
      return {
        run: { ...run, status: 'completed', output, completed_at: new Date().toISOString() },
        action: null,
      };
    } catch (error) {
      await this.repository.updateRun(run.id, 'failed', null, (error as Error).message);
      throw error;
    }
  }

  async getRun(companyId: string, id: string): Promise<AiRunRow> {
    const run = await this.repository.getRun(companyId, id);
    if (!run) throw new NotFoundException('Run de IA no encontrado');
    return run;
  }

  listActions(companyId: string, status?: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed') {
    return this.repository.listActions(companyId, status);
  }

  async approveAction(
    companyId: string,
    actionId: string,
    approverId: string,
  ): Promise<{ action: AiActionRow; run: AiRunRow }> {
    const claimed = await this.repository.claimAction(companyId, actionId, approverId);
    if (!claimed) {
      throw new ConflictException('La acción no existe o ya fue procesada');
    }

    const tool = await this.repository.findTool(claimed.tool_code);
    const run = await this.repository.getRun(companyId, claimed.run_id);
    if (!tool || !run) {
      const message = 'La tool o el run ya no existen';
      await this.repository.finishAction(claimed.id, 'failed', null, message);
      await this.repository.updateRun(claimed.run_id, 'failed', null, message);
      throw new NotFoundException(message);
    }

    try {
      const output = await this.executeTool(
        tool,
        run,
        companyId,
        claimed.requested_by,
        claimed.input,
      );
      await this.repository.finishAction(claimed.id, 'executed', output, null);
      await this.repository.updateRun(claimed.run_id, 'completed', output, null);
      return {
        action: { ...claimed, status: 'executed', output },
        run: { ...run, status: 'completed', output },
      };
    } catch (error) {
      const message = (error as Error).message;
      await this.repository.finishAction(claimed.id, 'failed', null, message);
      await this.repository.updateRun(claimed.run_id, 'failed', null, message);
      throw error;
    }
  }

  async rejectAction(
    companyId: string,
    actionId: string,
    approverId: string,
  ): Promise<AiActionRow> {
    const action = await this.repository.getAction(companyId, actionId);
    if (!action) throw new NotFoundException('Acción de IA no encontrada');
    if (action.status !== 'pending') {
      throw new ConflictException('La acción ya fue procesada');
    }

    await this.repository.finishAction(action.id, 'rejected', null, null);
    await this.repository.updateRun(action.run_id, 'rejected', null, null);
    return { ...action, status: 'rejected', approved_by: approverId };
  }

  private async executeTool(
    tool: AiToolRow,
    run: AiRunRow,
    companyId: string,
    userId: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    switch (tool.code) {
      case 'core.ai.echo':
        return {
          companyId,
          userId,
          input,
          at: new Date().toISOString(),
        };
      case 'core.ai.demo_write':
        await this.audit.log({
          companyId,
          userId,
          action: 'AI_DEMO_WRITE',
          entityType: 'AI',
          entityId: run.id,
          moduleCode: 'core.ai',
          source: 'ai',
          actorType: 'ai',
          actorId: run.id,
          newValues: input,
        });
        return { executed: true, runId: run.id };
      default:
        throw new Error(`No hay handler para la tool "${tool.code}"`);
    }
  }
}
