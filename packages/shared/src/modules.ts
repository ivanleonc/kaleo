export type ModuleVertical =
  | 'construction'
  | 'crm'
  | 'commerce'
  | 'energy'
  | 'bots'
  | null;

export type ModuleStatus = 'enabled' | 'trial' | 'read_only' | 'disabled';

export type AiToolRisk = 'read' | 'conversational' | 'business_write' | 'external';

export interface AiToolDefinition {
  code: string;
  name: string;
  description?: string;
  risk: AiToolRisk;
  requiresConfirmation: boolean;
  permission?: string;
  inputSchema?: Record<string, unknown>;
}

export interface ModuleRoute {
  /** Ruta relativa dentro de la empresa, ej. "/members". */
  path: string;
  /** Nombre del route de Vue Router. */
  name: string;
  title: string;
  permission?: string;
  /** Token de icono; el frontend lo mapea a su librería. */
  icon?: string;
  /** Si aparece en el sidebar. Las rutas de detalle deben omitirlo. */
  nav?: boolean;
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
  aiTools?: AiToolDefinition[];
}

export interface EnabledModule extends ModuleManifest {
  status: ModuleStatus;
}
