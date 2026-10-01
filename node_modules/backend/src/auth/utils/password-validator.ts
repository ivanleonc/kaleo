import { BadRequestException } from '@nestjs/common';

export function validatePasswordStrength(password: string): void {
  const errors: string[] = [];
  if (!password || password.length < 8) errors.push('mínimo 8 caracteres');
  if (!/[A-Z]/.test(password)) errors.push('al menos una mayúscula');
  if (!/[a-z]/.test(password)) errors.push('al menos una minúscula');
  if (!/\d/.test(password)) errors.push('al menos un número');
  if (errors.length > 0) {
    throw new BadRequestException(`Contraseña inválida: ${errors.join(', ')}.`);
  }
}
