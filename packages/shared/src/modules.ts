export type ModuleVertical =
  | 'construction'
  | 'crm'
  | 'commerce'
  | 'energy'
  | 'bots'
  | null;

export type ModuleStatus = 'enabled' | 'trial' | 'read_only' | 'disabled';

export interface ModuleRoute {
  /** Ruta relativa dentro de la empresa, ej. "/members". */
  path: string;
  /** Nombre del route de Vue Router. */
  name: string;
  title: string;
  permission?: string;
  /** Token de icono; el frontend lo mapea a su librería. */
  icon?: string;
  order?: number;
}

export interface ModuleManifest {
  code: string;
  name: string;
  version: string;
  vertical: ModuleVertical;
  isCore: boolean;
  dependsOn: string[];
  permissions: string[];
  routes: ModuleRoute[];
  featureFlags?: string[];
}

export interface EnabledModule extends ModuleManifest {
  status: ModuleStatus;
}
