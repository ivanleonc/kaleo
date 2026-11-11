export interface AppNotification {
  id: string;
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

export interface NotificationPreference {
  category: string;
  name: string;
  description: string;
  inApp: boolean;
  email: boolean;
}
