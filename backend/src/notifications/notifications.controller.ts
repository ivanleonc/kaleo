import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service.js';
import { UpdateNotificationPreferencesDto } from './dto/notification-preferences.dto.js';
import { Ok } from '../common/dto/api-response.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Audit } from '../common/decorators/audit-context.decorator.js';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('api/notifications')
@ApiHeader({ name: 'x-company-id', required: true })
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificaciones del usuario' })
  async list(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    return Ok(
      await this.notifications.list(requireCompany(companyId), userId, {
        unreadOnly: unreadOnly === 'true' || unreadOnly === '1',
        limit: Number(limit) || 20,
      }),
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Cantidad de notificaciones no leídas' })
  async unreadCount(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
  ) {
    return Ok({
      count: await this.notifications.unreadCount(requireCompany(companyId), userId),
    });
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Preferencias de notificación del usuario' })
  async preferences(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
  ) {
    return Ok(await this.notifications.getPreferences(requireCompany(companyId), userId));
  }

  @Put('preferences')
  @Audit({ entityType: 'Notification', skip: true })
  @ApiOperation({ summary: 'Actualizar preferencias de notificación' })
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return Ok(
      await this.notifications.updatePreferences(
        requireCompany(companyId),
        userId,
        dto.preferences,
      ),
      'Preferencias actualizadas',
    );
  }

  @Post('read-all')
  @Audit({ entityType: 'Notification', skip: true })
  @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
  async readAll(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
  ) {
    const updated = await this.notifications.markAllRead(requireCompany(companyId), userId);
    return Ok({ updated }, 'Notificaciones marcadas como leídas');
  }

  @Post(':id/read')
  @Audit({ entityType: 'Notification', skip: true })
  @ApiOperation({ summary: 'Marcar una notificación como leída' })
  async read(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const notification = await this.notifications.markRead(
      requireCompany(companyId),
      userId,
      id,
    );
    if (!notification) throw new BadRequestException('Notificación no encontrada');
    return Ok(notification);
  }
}

function requireCompany(companyId: string | undefined): string {
  if (!companyId) throw new BadRequestException('Falta el header x-company-id');
  return companyId;
}
