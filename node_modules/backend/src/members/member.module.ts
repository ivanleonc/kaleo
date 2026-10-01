import { Module } from '@nestjs/common';
import { MemberController } from './member.controller.js';
import { MemberService } from './member.service.js';
import { MemberRepository } from './repositories/member.repository.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { EmailModule } from '../email/email.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [RbacModule, EmailModule, AuthModule],
  controllers: [MemberController],
  providers: [MemberService, MemberRepository],
  exports: [MemberService],
})
export class MemberModule {}
