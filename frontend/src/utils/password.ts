export interface PasswordCheck {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
}

export function checkPassword(password: string): PasswordCheck {
  return {
    length: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
}

export function isPasswordValid(password: string): boolean {
  const check = checkPassword(password);
  return check.length && check.uppercase && check.lowercase && check.number;
}

export function passwordErrorMessage(password: string): string | null {
  const check = checkPassword(password);
  if (!check.length) return 'La contraseña debe tener al menos 6 caracteres.';
  if (!check.uppercase) return 'La contraseña debe incluir una letra mayúscula.';
  if (!check.lowercase) return 'La contraseña debe incluir una letra minúscula.';
  if (!check.number) return 'La contraseña debe incluir un número.';
  return null;
}

export type PasswordStrength = 'weak' | 'fair' | 'strong';

/** Requisito individual, listo para renderizar en una lista de checklist. */
export interface PasswordRequirement {
  key: keyof PasswordCheck;
  label: string;
  met: boolean;
}

/** Puntuación 0-6 usada para el ancho de la barra. */
export function passwordScore(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

export function passwordStrength(password: string): PasswordStrength {
  const score = passwordScore(password);
  if (score <= 2) return 'weak';
  if (score <= 4) return 'fair';
  return 'strong';
}

export function passwordStrengthLabel(password: string): string {
  const strength = passwordStrength(password);
  if (strength === 'weak') return 'Débil';
  if (strength === 'fair') return 'Aceptable';
  return 'Fuerte';
}

/** Porcentaje de la barra de fortaleza (0-100). */
export function passwordStrengthPercent(password: string): number {
  return Math.min((passwordScore(password) / 6) * 100, 100);
}

const REQUIREMENT_LABELS: Array<[keyof PasswordCheck, string]> = [
  ['length', 'Al menos 6 caracteres'],
  ['uppercase', 'Una letra mayúscula'],
  ['lowercase', 'Una letra minúscula'],
  ['number', 'Un número'],
];

/** Checklist de requisitos en el orden en que se deben cumplir. */
export function passwordRequirements(password: string): PasswordRequirement[] {
  const check = checkPassword(password);
  return REQUIREMENT_LABELS.map(([key, label]) => ({ key, label, met: check[key] }));
}
