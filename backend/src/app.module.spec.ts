import { describe, it, expect } from 'vitest';
import { AppModule } from './app.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

/**
 * Regresión: AppController/AppService deben estar registrados en el módulo
 * real. Sin esto, `/` y `/health` devuelven 404 en runtime (el health check
 * del hosting nunca pasa) aunque los tests del controlador estén en verde,
 * porque esos montan su propio módulo de prueba.
 */
describe('AppModule', () => {
  it('registra AppController y AppService (health check en runtime)', () => {
    const controllers = Reflect.getMetadata('controllers', AppModule) as unknown[];
    const providers = Reflect.getMetadata('providers', AppModule) as unknown[];
    expect(controllers).toContain(AppController);
    expect(providers).toContain(AppService);
  });
});
