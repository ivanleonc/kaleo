import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

export type DocumentStorageDriver = 'local' | 'supabase';

/**
 * Object storage para binarios de documentos.
 *
 * - `supabase`: API REST de Supabase Storage con la service role key. El
 *   bucket es privado; la descarga siempre pasa por el backend.
 * - `local`: filesystem para desarrollo/tests. No usar en producción.
 *
 * Las claves las genera el servicio de documentos (UUID), nunca el usuario,
 * pero se valida igualmente que no escapen del directorio raíz.
 */
@Injectable()
export class DocumentStorageService {
  private readonly logger = new Logger(DocumentStorageService.name);

  constructor(private readonly config: ConfigService) {}

  private get driver(): DocumentStorageDriver {
    const configured = this.config.get<string>('DOCUMENTS_STORAGE_DRIVER');
    if (configured === 'local' || configured === 'supabase') return configured;
    return this.config.get<string>('NODE_ENV') === 'production' ? 'supabase' : 'local';
  }

  private get localRoot(): string {
    return resolve(
      this.config.get<string>('DOCUMENTS_STORAGE_DIR') || '.data/documents',
    );
  }

  private get supabaseUrl(): string | undefined {
    return this.config.get<string>('SUPABASE_URL')?.replace(/\/+$/, '');
  }

  private get serviceRoleKey(): string | undefined {
    return this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
  }

  private get bucket(): string {
    return this.config.get<string>('SUPABASE_STORAGE_BUCKET') || 'documents';
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    if (this.driver === 'local') {
      const target = this.localPath(key);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, body);
      return;
    }

    // Supabase Storage usa POST para crear objetos (`PUT` es para update).
    // `x-upsert` hace la operación idempotente si se reintenta la subida.
    const response = await fetch(this.objectUrl(key), {
      method: 'POST',
      headers: {
        ...this.authHeaders(),
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: new Uint8Array(body),
    });

    if (!response.ok) {
      throw await this.storageError('subir', response);
    }
  }

  async get(key: string): Promise<Buffer> {
    if (this.driver === 'local') {
      try {
        return await readFile(this.localPath(key));
      } catch {
        throw new ServiceUnavailableException('El archivo del documento no está disponible');
      }
    }

    const response = await fetch(this.objectUrl(key), {
      headers: this.authHeaders(),
    });

    if (!response.ok) {
      throw await this.storageError('descargar', response);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    if (this.driver === 'local') {
      try {
        await unlink(this.localPath(key));
      } catch {
        // El binario ya no existe: el borrado es idempotente.
      }
      return;
    }

    const response = await fetch(this.objectUrl(key), {
      method: 'DELETE',
      headers: this.authHeaders(),
    });

    // 404 también es éxito: el objeto ya no está.
    if (!response.ok && response.status !== 404) {
      throw await this.storageError('eliminar', response);
    }
  }

  private localPath(key: string): string {
    const root = this.localRoot;
    const target = resolve(root, key);
    if (target !== root && !target.startsWith(`${root}${sep}`)) {
      throw new Error('Ruta de almacenamiento inválida');
    }
    return target;
  }

  private authHeaders(): Record<string, string> {
    const key = this.requireConfig();
    return {
      Authorization: `Bearer ${key}`,
      apikey: key,
    };
  }

  private objectUrl(key: string): string {
    const url = this.supabaseUrl;
    if (!url) this.requireConfig();
    const bucket = encodeURIComponent(this.bucket);
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    return `${url}/storage/v1/object/${bucket}/${encodedKey}`;
  }

  private requireConfig(): string {
    const url = this.supabaseUrl;
    const key = this.serviceRoleKey;
    if (!url || !key) {
      this.logger.error(
        'Supabase Storage no está configurado: define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY',
      );
      throw new ServiceUnavailableException(
        'El almacenamiento de documentos no está configurado',
      );
    }
    return key;
  }

  private async storageError(action: string, response: Response): Promise<Error> {
    let detail = '';
    try {
      detail = (await response.text()).slice(0, 300);
    } catch {
      // Sin cuerpo de error legible.
    }
    this.logger.error(
      `Supabase Storage falló al ${action} un objeto (${response.status}): ${detail}`,
    );
    return new ServiceUnavailableException(
      'No pudimos acceder al almacenamiento de documentos',
    );
  }
}
