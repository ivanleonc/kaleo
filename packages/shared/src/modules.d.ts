export type ModuleVertical = 'construction' | 'crm' | 'commerce' | 'energy' | 'bots' | null;
export type ModuleStatus = 'enabled' | 'trial' | 'read_only' | 'disabled';
export interface ModuleRoute {
    path: string;
    name: string;
    title: string;
    permission?: string;
    icon?: string;
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
}
export interface EnabledModule extends ModuleManifest {
    status: ModuleStatus;
}
