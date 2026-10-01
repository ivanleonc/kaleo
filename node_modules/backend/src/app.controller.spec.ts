import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;
  const query = vi.fn();

  beforeEach(async () => {
    query.mockReset();
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: DataSource, useValue: { query } },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('responde ok cuando la BD contesta', async () => {
      query.mockResolvedValue([{ '?column?': 1 }]);
      const health = await appController.getHealth();
      expect(query).toHaveBeenCalledWith('SELECT 1');
      expect(health).toMatchObject({ status: 'ok', database: 'up' });
    });

    it('lanza 503 cuando la BD no contesta (el hosting no manda tráfico)', async () => {
      query.mockRejectedValue(new Error('connection refused'));
      await expect(appController.getHealth()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
