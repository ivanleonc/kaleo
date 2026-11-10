import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CompanyMemberController } from './company-member.controller.js';
import { MemberService } from './member.service.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';

const COMPANY_ID = 'f8c09c42-ebe3-47e8-9388-30a6341de408';
const USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

describe('CompanyMemberController (rutas)', () => {
  let app: INestApplication;
  let service: { attachMember: ReturnType<typeof vi.fn>; removeMember: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    service = {
      attachMember: vi.fn().mockResolvedValue({ id: USER_ID, isNewUser: false }),
      removeMember: vi.fn().mockResolvedValue({ message: 'Miembro eliminado' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyMemberController],
      providers: [{ provide: MemberService, useValue: service }],
    })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('expone POST /api/companies/:id/members', async () => {
    await request(app.getHttpServer())
      .post(`/api/companies/${COMPANY_ID}/members`)
      .set('x-company-id', COMPANY_ID)
      .send({ userId: USER_ID, roleNames: ['Admin'] })
      .expect(201);

    expect(service.attachMember).toHaveBeenCalledWith(
      COMPANY_ID,
      expect.objectContaining({ userId: USER_ID, roleNames: ['Admin'] }),
    );
  });

  it('expone DELETE /api/companies/:id/members/:userId', async () => {
    await request(app.getHttpServer())
      .delete(`/api/companies/${COMPANY_ID}/members/${USER_ID}`)
      .set('x-company-id', COMPANY_ID)
      .expect(200);

    expect(service.removeMember).toHaveBeenCalledWith(COMPANY_ID, USER_ID);
  });

  it('rechaza la operación si el header no coincide con la empresa destino', async () => {
    await request(app.getHttpServer())
      .post(`/api/companies/${COMPANY_ID}/members`)
      .set('x-company-id', '11111111-1111-4111-8111-111111111111')
      .send({ userId: USER_ID, roleNames: ['Admin'] })
      .expect(403);

    expect(service.attachMember).not.toHaveBeenCalled();
  });
});
