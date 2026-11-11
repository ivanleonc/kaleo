import { describe, expect, it, vi } from 'vitest';
import { NotificationsService } from './notifications.service.js';
import { NOTIFICATION_CATEGORIES } from './notifications.types.js';

function createService(overrides: Record<string, any> = {}) {
  const repository = {
    list: vi.fn(async () => []),
    unreadCount: vi.fn(async () => 2),
    create: vi.fn(async (input) => ({
      id: 'notification-1',
      company_id: input.companyId,
      user_id: input.userId,
      type: input.type,
      category: input.category,
      title: input.title,
      body: input.body,
      link: input.link,
      data: input.data,
      read_at: null,
      emailed_at: null,
      created_at: new Date().toISOString(),
    })),
    markRead: vi.fn(async () => ({ id: 'notification-1' })),
    markAllRead: vi.fn(async () => 3),
    markEmailed: vi.fn(async () => {}),
    getPreferences: vi.fn(async () => new Map()),
    upsertPreferences: vi.fn(async () => {}),
    getUserEmail: vi.fn(async () => 'user@example.com'),
    ...overrides,
  } as any;
  const jobs = { enqueue: vi.fn(async () => 'job-1') } as any;
  const config = { get: vi.fn((key: string) => (key === 'FRONTEND_URL' ? 'https://app.test' : undefined)) } as any;
  return { service: new NotificationsService(repository, jobs, config), repository, jobs, config };
}

describe('NotificationsService', () => {
  it('crea la notificación in-app y encola el email por defecto', async () => {
    const { service, repository, jobs } = createService();

    const notification = await service.notify({
      companyId: 'company-1',
      userId: 'user-1',
      type: 'operation.completed',
      title: 'Operación completada',
      body: 'Tu exportación está lista',
      link: '/operations',
    });

    expect(notification?.id).toBe('notification-1');
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'operations', type: 'operation.completed' }),
    );
    expect(jobs.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        queue: 'email.send',
        payload: expect.objectContaining({
          to: 'user@example.com',
          html: expect.stringContaining('https://app.test/companies/company-1/operations'),
        }),
      }),
    );
    expect(repository.markEmailed).toHaveBeenCalledWith('company-1', 'notification-1');
  });

  it('no crea nada si el usuario desactivó ambos canales', async () => {
    const { service, repository, jobs } = createService({
      getPreferences: vi.fn(async () => new Map([
        ['operations', { category: 'operations', in_app: false, email_enabled: false }],
      ])),
    });

    const notification = await service.notify({
      companyId: 'company-1',
      userId: 'user-1',
      type: 'operation.failed',
      title: 'Falló',
    });

    expect(notification).toBeNull();
    expect(repository.create).not.toHaveBeenCalled();
    expect(jobs.enqueue).not.toHaveBeenCalled();
  });

  it('omite el email si el usuario lo desactivó', async () => {
    const { service, repository, jobs } = createService({
      getPreferences: vi.fn(async () => new Map([
        ['operations', { category: 'operations', in_app: true, email_enabled: false }],
      ])),
    });

    await service.notify({
      companyId: 'company-1',
      userId: 'user-1',
      type: 'operation.completed',
      title: 'Listo',
    });

    expect(repository.create).toHaveBeenCalled();
    expect(jobs.enqueue).not.toHaveBeenCalled();
  });

  it('devuelve las categorías con defaults cuando no hay preferencias guardadas', async () => {
    const { service } = createService();
    const preferences = await service.getPreferences('company-1', 'user-1');

    expect(preferences).toHaveLength(NOTIFICATION_CATEGORIES.length);
    expect(preferences[0]).toMatchObject({ category: 'operations', inApp: true, email: true });
  });

  it('rechaza categorías desconocidas al actualizar preferencias', async () => {
    const { service } = createService();

    await expect(
      service.updatePreferences('company-1', 'user-1', [
        { category: 'unknown', inApp: true, email: true },
      ]),
    ).rejects.toThrow('Categoría de notificación desconocida');
  });

  it('delega el conteo y el marcar todo como leído', async () => {
    const { service, repository } = createService();

    await expect(service.unreadCount('company-1', 'user-1')).resolves.toBe(2);
    await expect(service.markAllRead('company-1', 'user-1')).resolves.toBe(3);
    expect(repository.markAllRead).toHaveBeenCalledWith('company-1', 'user-1');
  });
});
