import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenBlacklistRepository } from '../repositories/token-blacklist.repository.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private tokenBlacklistRepository: TokenBlacklistRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    const token = req.headers?.authorization?.split(' ')[1];
    if (token && await this.tokenBlacklistRepository.isBlacklisted(token)) {
      throw new UnauthorizedException('Sesión inválida.');
    }

    const companyRoles = payload.companyRoles || {};
    const companyPermissions = payload.companyPermissions || {};

    return {
      id: payload.id,
      must_change_password: payload.must_change_password,
      companies: payload.companies,
      companyRoles,
      companyPermissions,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
    };
  }
}
