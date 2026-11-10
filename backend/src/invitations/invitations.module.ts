import { Module } from '@nestjs/common';
import { InvitationsController } from './invitations.controller.js';
import { InvitationsPublicController } from './invitations-public.controller.js';
import { InvitationsService } from './invitations.service.js';
import { InvitationsRepository } from './invitations.repository.js';
import { MemberModule } from '../members/member.module.js';
import { CompanyModule } from '../company/company.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { EmailModule } from '../email/email.module.js';

@Module({
  imports: [MemberModule, CompanyModule, AuthModule, EmailModule],
  controllers: [InvitationsController, InvitationsPublicController],
  providers: [InvitationsService, InvitationsRepository],
  exports: [InvitationsService],
})
export class InvitationsModule {}
