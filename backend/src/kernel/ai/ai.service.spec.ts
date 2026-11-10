import { describe, expect, it, vi } from 'vitest';
import { AiService } from './ai.service.js';
import type { AiActionRow, AiRunRow, AiToolRow } from './ai.types.js';

const ECHO: AiToolRow = {
  code: 'core.ai.echo',
  module_code: 'core.ai',
  name: 'Echo',
  description: null,
  risk: 'read',
  requires_confirmation: false,
  permission: 'core.ai.read',
  input_schema: {},
  is_active: true,
};

const DEMO_WRITE: AiToolRow = {
  ...ECHO,
  code: 'core.ai.demo_write',
  name: 'Demo write',
  risk: 'business_write',
  requires_confirmation: true,
};

function run(overrides: Partial<AiRunRow> = {}): AiRunRow {
  return {
    id: 'run-1',
    company_id: 'company-1',
    user_id: 'user-1',
    tool_code: 'core.ai.echo',
    status: 'running',
    input: {},
    output: null,
    error: null,
    created_at: new Date().toISOString(),
    completed_at: null,
    ...overrides,
  };
}

function action(overrides: Partial<AiActionRow> = {}): AiActionRow {
  return {
    id: 'action-1',
    company_id: 'company-1',
    run_id: 'run-1',
    tool_code: 'core.ai.demo_write',
    requested_by: 'user-1',
    status: 'pending',
    input: { x: 1 },
    output: null,
    error: null,
    approved_by: null,
    approved_at: null,
    executed_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function setup() {
  const repository = {
    listTools: vi.fn(),
    findTool: vi.fn(),
    createRun: vi.fn(async (_c, _u, code, _input, status) =>
      run({ tool_code: code, status }),
    ),
    getRun: vi.fn(async () => run()),
    updateRun: vi.fn(async () => {}),
    createAction: vi.fn(async () => action()),
    getAction: vi.fn(async () => action()),
    listActions: vi.fn(),
    claimAction: vi.fn(async () => action({ status: 'approved' })),
    finishAction: vi.fn(async () => {}),
  } as any;
  const audit = { log: vi.fn(async () => {}) } as any;
  return { service: new AiService(repository, audit), repository, audit };
}

describe('AiService', () => {
  it('ejecuta una tool de lectura sin HITL', async () => {
    const { service, repository } = setup();
    repository.findTool.mockResolvedValue(ECHO);

    const result = await service.createRun('company-1', 'user-1', 'core.ai.echo', { a: 1 });

    expect(result.action).toBeNull();
    expect(result.run.status).toBe('completed');
    expect(repository.createAction).not.toHaveBeenCalled();
    expect(repository.updateRun).toHaveBeenCalledWith(
      'run-1',
      'completed',
      expect.objectContaining({ companyId: 'company-1' }),
      null,
    );
  });

  it('crea una acción HITL para business_write', async () => {
    const { service, repository } = setup();
    repository.findTool.mockResolvedValue(DEMO_WRITE);

    const result = await service.createRun('company-1', 'user-1', 'core.ai.demo_write', { a: 1 });

    expect(result.action?.status).toBe('pending');
    expect(result.run.status).toBe('awaiting_confirmation');
    expect(repository.createAction).toHaveBeenCalled();
  });

  it('aprueba y ejecuta la acción HITL', async () => {
    const { service, repository, audit } = setup();
    repository.findTool.mockResolvedValue(DEMO_WRITE);
    repository.getRun.mockResolvedValue(run({ status: 'awaiting_confirmation' }));

    const result = await service.approveAction('company-1', 'action-1', 'approver-1');

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'AI_DEMO_WRITE', companyId: 'company-1' }),
    );
    expect(repository.finishAction).toHaveBeenCalledWith(
      'action-1',
      'executed',
      expect.any(Object),
      null,
    );
    expect(result.action.status).toBe('executed');
  });

  it('rechaza una acción pendiente', async () => {
    const { service, repository } = setup();

    const result = await service.rejectAction('company-1', 'action-1', 'approver-1');

    expect(result.status).toBe('rejected');
    expect(repository.finishAction).toHaveBeenCalledWith(
      'action-1',
      'rejected',
      null,
      null,
    );
    expect(repository.updateRun).toHaveBeenCalledWith('run-1', 'rejected', null, null);
  });
});
