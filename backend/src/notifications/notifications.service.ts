import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsRepository } from './notifications.repository.js';
import {
  categoryForType,
  DEFAULT_NOTIFICATION_PREFERENCE,
  NOTIFICATION_CATEGORIES,
  type CreateNotificationInput,
  type NotificationPreference,
  type NotificationRow,
} from './notifications.types.js';
import { JobsService } from '../kernel/jobs/jobs.service.js';
import { EMAIL_SEND_QUEUE } from '../kernel/jobs/email-job.handler.js';
import { notificationTemplate } from '../email/templates.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly repository: NotificationsRepository,
    private readonly jobs: JobsService,
    private readonly config: ConfigService,
  ) {}

  async list(
    companyId: string,
    userId: string,
    options: { unreadOnly?: boolean; limit?: number } = {},
  ): Promise<{ items: NotificationRow[]; unreadCount: number }> {
    const [items, unreadCount] = await Promise.all([
      this.repository.list(companyId, userId, {
        unreadOnly: options.unreadOnly === true,
        limit: Math.min(Math.max(options.limit ?? 20, 1), 100),
      }),
      this.repository.unreadCount(companyId, userId),
    ]);
    return { items, unreadCount };
  }

  unreadCount(companyId: string, userId: string): Promise<number> {
    return this.repository.unreadCount(companyId, userId);
  }

  async markRead(
    companyId: string,
    userId: string,
    notificationId: string,
  ): Promise<NotificationRow | null> {
    return this.repository.markRead(companyId, userId, notificationId);
  }

  markAllRead(companyId: string, userId: string): Promise<number> {
    return this.repository.markAllRead(companyId, userId);
  }

  async getPreferences(
    companyId: string,
    userId: string,
  ): Promise<NotificationPreference[]> {
    const stored = await this.repository.getPreferences(companyId, userId);
    return NOTIFICATION_CATEGORIES.map((category) => {
      const row = stored.get(category.code);
      return {
        category: category.code,
        name: category.name,
        description: category.description,
        inApp: row?.in_app ?? DEFAULT_NOTIFICATION_PREFERENCE.inApp,
        email: row?.email_enabled ?? DEFAULT_NOTIFICATION_PREFERENCE.email,
      };
    });
  }

  async updatePreferences(
    companyId: string,
    userId: string,
    preferences: Array<{ category: string; inApp: boolean; email: boolean }>,
  ): Promise<NotificationPreference[]> {
    const valid = new Set(NOTIFICATION_CATEGORIES.map((category) => category.code));
    const unknown = preferences.find((preference) => !valid.has(preference.category as never));
    if (unknown) {
      throw new BadRequestException(`Categoría de notificación desconocida: ${unknown.category}`);
    }

    await this.repository.upsertPreferences(companyId, userId, preferences);
    return this.getPreferences(companyId, userId);
  }

  /**
   * Crea una notificación respetando las preferencias del usuario.
   *
   * Si el usuario desactivó in-app y email no se crea nada. Si desactivó solo
   * email, la notificación queda en el historial. El envío de correo es
   * best-effort: un fallo al encolar no revierte la notificación in-app.
   */
  async notify(input: CreateNotificationInput): Promise<NotificationRow | null> {
    const category = input.category ?? categoryForType(input.type);
    const preferences = await this.repository.getPreferences(input.companyId, input.userId);
    const stored = preferences.get(category);
    const inApp = stored?.in_app ?? DEFAULT_NOTIFICATION_PREFERENCE.inApp;
    const email = stored?.email_enabled ?? DEFAULT_NOTIFICATION_PREFERENCE.email;

    if (!inApp && !email) return null;

    let notification: NotificationRow | null = null;
    if (inApp) {
      notification = await this.repository.create({
        companyId: input.companyId,
        userId: input.userId,
        type: input.type,
        category,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        data: input.data ?? {},
      });
    }

    if (email) {
      await this.enqueueEmail(input, notification);
    }

    return notification;
  }

  private async enqueueEmail(
    input: CreateNotificationInput,
    notification: NotificationRow | null,
  ): Promise<void> {
    try {
      const to = await this.repository.getUserEmail(input.userId);
      if (!to) {
        this.logger.debug(`Usuario ${input.userId} sin email; se omite notificación`);
        return;
      }

      const template = notificationTemplate(
        input.title,
        input.body ?? null,
        this.absoluteLink(input.companyId, input.link),
      );

      await this.jobs.enqueue({
        companyId: input.companyId,
        queue: EMAIL_SEND_QUEUE,
        payload: {
          to,
          subject: template.subject,
          html: template.html,
          userId: input.userId,
        },
      });

      if (notification) {
        await this.repository.markEmailed(input.companyId, notification.id);
      }
    } catch (error) {
      this.logger.warn(
        `No se pudo encolar el email de la notificación "${input.type}": ${
          (error as Error).message
        }`,
      );
    }
  }

  private absoluteLink(companyId: string, link?: string | null): string | null {
    if (!link) return null;
    if (/^https?:\/\//i.test(link)) return link;

    const frontend = (this.config.get<string>('FRONTEND_URL') || '').replace(/\/+$/, '');
    if (!frontend) return null;
    const path = link.startsWith('/') ? link : `/${link}`;
    return `${frontend}/companies/${companyId}${path}`;
  }
}
