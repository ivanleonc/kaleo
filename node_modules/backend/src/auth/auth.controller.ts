import { Controller, Post, Get, Put, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ChangePasswordDto, UpdatePasswordDto } from './dto/change-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { LogoutDto } from './dto/logout.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { SkipPasswordChanged } from './decorators/skip-password-changed.decorator.js';
import { Ok } from '../common/dto/api-response.dto.js';
import { Audit } from '../common/decorators/audit-context.decorator.js';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: 'Registrar nuevo usuario', description: 'Crea un usuario y retorna tokens de autenticación (auto-login). Si el email ya existe, retorna 409.' })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado y autenticado',
    schema: {
      example: {
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIs...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIs...',
          user: {
            id: 'uuid',
            email: 'nuevo@empresa.com',
            name: 'Juan Pérez',
            must_change_password: false,
            email_verified: false,
            password_expired: false,
            tenants: [],
            roles: [],
            permissions: [],
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos (email formato incorrecto, password < 6 caracteres)' })
  @ApiResponse({ status: 409, description: 'El correo ya está registrado' })
  async register(@Body() registerDto: RegisterDto) {
    const { message, accessToken, refreshToken, user } = await this.authService.register(registerDto.email, registerDto.password, registerDto.name);
    return Ok({ accessToken, refreshToken, user }, message);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión', description: 'Retorna accessToken (15min) y refreshToken (7d). Si la cuenta está bloqueada por intentos fallidos, retorna error con tiempo restante.' })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso',
    schema: {
      example: {
        success: true,
        message: 'Login exitoso',
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIs...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIs...',
          user: {
            id: 'uuid',
            email: 'usuario@empresa.com',
            name: 'Juan Pérez',
            must_change_password: false,
            email_verified: true,
            password_expired: false,
            tenants: [{ id: 'company-uuid', name: 'Mi Empresa', roles: ['Owner'] }],
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @ApiResponse({ status: 403, description: 'Cuenta bloqueada temporalmente por intentos fallidos' })
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    const { message, ...data } = await this.authService.login(
      loginDto.email,
      loginDto.password,
      req.ip,
      req.headers['user-agent'],
    );
    return Ok(data, message);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refrescar tokens', description: 'Intercambia un refreshToken válido por un nuevo par de tokens (accessToken + refreshToken). El refreshToken anterior se revoca.' })
  @ApiResponse({
    status: 200,
    description: 'Tokens renovados',
    schema: {
      example: {
        success: true,
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIs...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIs...',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o expirado' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    const data = await this.authService.refresh(refreshTokenDto.refreshToken);
    return Ok(data);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Audit({ entityType: 'Auth', skipDiff: true })
  @ApiOperation({ summary: 'Cerrar sesión', description: 'Invalida el accessToken actual (agrega a blacklist) y opcionalmente un refreshToken específico.' })
  @ApiResponse({
    status: 200,
    description: 'Sesión cerrada',
    schema: {
      example: {
        success: true,
        message: 'Sesión cerrada correctamente',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Token JWT inválido' })
  async logout(
    @CurrentUser('id') userId: string,
    @Req() req: any,
    @Body() logoutDto: LogoutDto,
  ) {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.replace('Bearer ', '');
    const result = await this.authService.logout(userId, accessToken, logoutDto.refreshToken);
    return Ok(undefined, result.message);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Perfil del usuario con sus empresas',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          email: 'usuario@empresa.com',
          name: 'Juan Pérez',
          must_change_password: false,
          email_verified: true,
          password_expired: false,
          tenants: [{ id: 'company-uuid', name: 'Mi Empresa', roles: ['Owner'] }],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Token JWT inválido' })
  async getProfile(@CurrentUser('id') userId: string) {
    const data = await this.authService.getProfile(userId);
    return Ok(data);
  }

  @Put('profile')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar perfil del usuario', description: 'Permite cambiar nombre y email. El email debe ser único.' })
  @ApiResponse({
    status: 200,
    description: 'Perfil actualizado',
    schema: { example: { success: true, message: 'Perfil actualizado correctamente' } },
  })
  @ApiResponse({ status: 409, description: 'El email ya está en uso' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    const result = await this.authService.updateProfile(userId, dto);
    return Ok({ pending_email: result.pending_email }, result.message);
  }

  @Post('profile/email/resend')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Audit({ entityType: 'Auth', skipDiff: true })
  @ApiOperation({ summary: 'Reenviar verificación al correo pendiente' })
  @ApiResponse({ status: 200, description: 'Correo de verificación reenviado' })
  @ApiResponse({ status: 401, description: 'Token JWT inválido' })
  @ApiResponse({ status: 409, description: 'No hay cambio de correo pendiente' })
  async resendEmailVerification(@CurrentUser('id') userId: string) {
    const result = await this.authService.resendEmailVerification(userId);
    return Ok({ email: result.email });
  }

  @Post('profile/email/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Audit({ entityType: 'Auth', skipDiff: true })
  @ApiOperation({ summary: 'Cancelar el cambio de correo pendiente' })
  @ApiResponse({ status: 200, description: 'Cambio de correo cancelado' })
  @ApiResponse({ status: 401, description: 'Token JWT inválido' })
  async cancelEmailChange(@CurrentUser('id') userId: string) {
    const result = await this.authService.cancelEmailChange(userId);
    return Ok(undefined, result.message);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Confirmar cambio de correo con token', description: 'Endpoint público. Activa el correo pendiente.' })
  @ApiBody({ schema: { example: { token: 'a1b2c3d4e5f6...' } } })
  @ApiResponse({ status: 200, description: 'Correo verificado y actualizado' })
  @ApiResponse({ status: 401, description: 'Enlace inválido o expirado' })
  async verifyEmail(@Body() body: { token: string }) {
    const result = await this.authService.verifyEmail(body?.token);
    return Ok(undefined, result.message);
  }

  @SkipPasswordChanged()
  @Post('change-temporary-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Audit({ entityType: 'Auth', skipDiff: true })
  @ApiOperation({ summary: 'Cambiar contraseña temporal (onboarding)' })
  @ApiResponse({
    status: 200,
    description: 'Contraseña actualizada',
    schema: { example: { success: true, message: 'Contraseña actualizada correctamente. Ya puedes acceder al sistema.' } },
  })
  @ApiResponse({ status: 400, description: 'Contraseña < 6 caracteres' })
  @ApiResponse({ status: 401, description: 'Token JWT inválido' })
  @ApiResponse({ status: 403, description: 'No puedes reusar contraseñas recientes' })
  async changeTemporaryPassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const result = await this.authService.changeTemporaryPassword(userId, changePasswordDto.newPassword);
    return Ok(undefined, result.message);
  }

  @SkipPasswordChanged()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Audit({ entityType: 'Auth', skipDiff: true })
  @ApiOperation({ summary: 'Cambiar contraseña (usuario autenticado)', description: 'Requiere la contraseña actual. No permite reusar las últimas 3 contraseñas.' })
  @ApiResponse({
    status: 200,
    description: 'Contraseña actualizada',
    schema: { example: { success: true, message: 'Contraseña actualizada correctamente.' } },
  })
  @ApiResponse({ status: 401, description: 'Contraseña actual incorrecta o token inválido' })
  @ApiResponse({ status: 403, description: 'No puedes reusar contraseñas recientes' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() body: UpdatePasswordDto,
  ) {
    const result = await this.authService.changePassword(userId, body.currentPassword, body.newPassword);
    return Ok(undefined, result.message);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar recuperación de contraseña', description: 'Envía un email con token de recuperación (15min). Respuesta genérica por seguridad.' })
  @ApiResponse({
    status: 200,
    description: 'Instrucciones enviadas',
    schema: { example: { success: true, message: 'Si el correo existe, se han enviado las instrucciones.' } },
  })
  @ApiResponse({ status: 400, description: 'Email con formato inválido' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const result = await this.authService.requestPasswordReset(forgotPasswordDto.email);
    return Ok(undefined, result.message);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restablecer contraseña con token', description: 'El token se invalida al usarlo. Se revocan todos los refresh tokens del usuario.' })
  @ApiResponse({
    status: 200,
    description: 'Contraseña restablecida',
    schema: { example: { success: true, message: 'Contraseña recuperada y actualizada correctamente.' } },
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'Token inválido o expirado' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
    return Ok(undefined, result.message);
  }
}
