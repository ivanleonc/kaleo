export const NOTIFICATION_CATEGORIES = [
  {
    code: 'operations',
    name: 'Operaciones',
    description: 'Exportaciones, reportes e importaciones en segundo plano.',
  },
  {
    code: 'documents',
    name: 'Documentos',
    description: 'Cargas, versiones y cambios en documentos.',
  },
  {
    code: 'security',
    name: 'Seguridad',
    description: 'Inicios de sesión, contraseñas y cambios sensibles.',
  },
  {
    code: 'system',
    name: 'Sistema',
    description: 'Avisos generales de la plataforma.',
  },
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]['code'];

export const DEFAULT_NOTIFICATION_PREFERENCE = {
  inApp: true,
  email: true,
} as const;

export interface NotificationRow {
  id: string;
  company_id: string;
  user_id: string;
  type: string;
  category: string;
  title: string;
  body: string | null;
  link: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  emailed_at: string | null;
  created_at: string;
}

export interface NotificationPreferenceRow {
  category: string;
  in_app: boolean;
  email_enabled: boolean;
}

export interface NotificationPreference {
  category: string;
  name: string;
  description: string;
  inApp: boolean;
  email: boolean;
}

export interface CreateNotificationInput {
  companyId: string;
  userId: string;
  type: string;
  category?: NotificationCategory;
  title: string;
  body?: string | null;
  link?: string | null;
  data?: Record<string, unknown>;
}

const TYPE_PREFIX_TO_CATEGORY: Record<string, NotificationCategory> = {
  operation: 'operations',
  document: 'documents',
  security: 'security',
  system: 'system',
};

export function categoryForType(type: string): NotificationCategory {
  const prefix = type.split('.')[0];
  return TYPE_PREFIX_TO_CATEGORY[prefix] ?? 'system';
}
