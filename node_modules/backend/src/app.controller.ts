import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service.js';
import { Public } from './auth/decorators/public.decorator.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Sonda de salud para el hosting (Render health path: /health).
   * 200 solo si la BD responde; 503 si no, para que el deploy no
   * reciba tráfico con Postgres caído.
   */
  @Public()
  @Get('health')
  async getHealth() {
    const health = await this.appService.getHealth();
    if (health.status !== 'ok') {
      throw new ServiceUnavailableException(health);
    }
    return health;
  }
}
