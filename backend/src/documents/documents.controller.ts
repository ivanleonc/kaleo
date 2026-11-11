import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService, DOCUMENT_MAX_BYTES } from './documents.service.js';
import {
  CreateDocumentDto,
  CreateDocumentLinkDto,
  UpdateDocumentDto,
} from './dto/create-document.dto.js';
import { Ok, OkPaged } from '../common/dto/api-response.dto.js';
import { Permissions } from '../common/constants/permissions.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { Audit } from '../common/decorators/audit-context.decorator.js';
import type { DocumentStatus } from './documents.types.js';

const FILE_LIMIT = { fileSize: DOCUMENT_MAX_BYTES };

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('api/documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.DOCUMENTS.READ)
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({ summary: 'Listar documentos de la empresa' })
  async list(
    @Headers('x-company-id') companyId: string | undefined,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const resolved = requireCompany(companyId);
    const parsedPage = Math.max(1, Number(page) || 1);
    const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 25));
    const resolvedStatus: DocumentStatus | undefined =
      status === 'active' || status === 'archived' ? status : undefined;

    const result = await this.documents.list(resolved, {
      search: search?.trim() || undefined,
      category: category?.trim() || undefined,
      status: resolvedStatus,
      page: parsedPage,
      limit: parsedLimit,
    });

    return OkPaged(result.items, result.total, parsedPage, parsedLimit);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.DOCUMENTS.CREATE)
  @UseInterceptors(FileInterceptor('file', { limits: FILE_LIMIT }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string' },
        entityType: { type: 'string' },
        entityId: { type: 'string' },
      },
      required: ['file'],
    },
  })
  @Audit({
    entityType: 'Document',
    resolveCreatedId: (response: any) => response?.data?.document?.id,
  })
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({ summary: 'Subir un documento' })
  async create(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file: any,
  ) {
    const resolved = requireCompany(companyId);
    const detail = await this.documents.create(
      resolved,
      userId,
      {
        title: dto.title ?? '',
        description: dto.description,
        category: dto.category,
        link: linkFromDto(dto),
      },
      fileInput(file),
    );
    return Ok(detail, 'Documento subido');
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.DOCUMENTS.READ)
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({ summary: 'Detalle, versiones y vínculos de un documento' })
  async get(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return Ok(await this.documents.get(requireCompany(companyId), id));
  }

  @Get(':id/download')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.DOCUMENTS.READ)
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({ summary: 'Descargar una versión (por defecto la actual)' })
  async download(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('version') version?: string,
  ) {
    const parsedVersion = version === undefined ? undefined : Number(version);
    const file = await this.documents.download(requireCompany(companyId), id, parsedVersion);

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: contentDisposition(file.filename),
    });
  }

  @Post(':id/versions')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.DOCUMENTS.CREATE)
  @UseInterceptors(FileInterceptor('file', { limits: FILE_LIMIT }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @Audit({ entityType: 'Document', idParam: 'id' })
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({ summary: 'Subir una nueva versión de un documento' })
  async addVersion(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: any,
  ) {
    const result = await this.documents.addVersion(
      requireCompany(companyId),
      userId,
      id,
      fileInput(file),
    );
    return Ok(result, 'Versión subida');
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.DOCUMENTS.UPDATE)
  @Audit({ entityType: 'Document', idParam: 'id' })
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({ summary: 'Actualizar metadata o archivar un documento' })
  async update(
    @CurrentUser('id') userId: string,
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return Ok(
      await this.documents.update(requireCompany(companyId), userId, id, dto),
      'Documento actualizado',
    );
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.DOCUMENTS.DELETE)
  @Audit({ entityType: 'Document', idParam: 'id' })
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({ summary: 'Eliminar un documento y sus versiones' })
  async remove(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.documents.delete(requireCompany(companyId), id);
    return Ok(undefined, 'Documento eliminado');
  }

  @Post(':id/links')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.DOCUMENTS.UPDATE)
  @Audit({ entityType: 'Document', idParam: 'id' })
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({ summary: 'Vincular un documento a otra entidad' })
  async addLink(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDocumentLinkDto,
  ) {
    return Ok(
      await this.documents.addLink(requireCompany(companyId), id, dto),
      'Vínculo creado',
    );
  }

  @Delete(':id/links/:linkId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions(Permissions.DOCUMENTS.UPDATE)
  @Audit({ entityType: 'Document', idParam: 'id' })
  @ApiHeader({ name: 'x-company-id', required: true })
  @ApiOperation({ summary: 'Quitar un vínculo de documento' })
  async removeLink(
    @Headers('x-company-id') companyId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
  ) {
    await this.documents.removeLink(requireCompany(companyId), id, linkId);
    return Ok(undefined, 'Vínculo eliminado');
  }
}

function requireCompany(companyId: string | undefined): string {
  if (!companyId) throw new BadRequestException('Falta el header x-company-id');
  return companyId;
}

function fileInput(file: any) {
  if (!file) throw new BadRequestException('Falta el archivo');
  return {
    buffer: file.buffer as Buffer,
    filename: String(file.originalname ?? 'documento'),
    contentType: String(file.mimetype ?? 'application/octet-stream'),
  };
}

function linkFromDto(dto: CreateDocumentDto) {
  if (!dto.entityType && !dto.entityId) return null;
  if (!dto.entityType || !dto.entityId) {
    throw new BadRequestException('entityType y entityId deben enviarse juntos');
  }
  return { entityType: dto.entityType, entityId: dto.entityId };
}

function contentDisposition(filename: string): string {
  const fallback = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
