import { BadRequestException, Controller, Get, Headers } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ModuleRegistryService } from './module-registry.service.js';
import { Ok } from '../../common/dto/api-response.dto.js';

@ApiTags('Modules')
@ApiBearerAuth()
@Controller('api/modules')
export class ModuleRegistryController {
  constructor(private readonly moduleRegistry: ModuleRegistryService) {}

  @Get()
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiOperation({
    summary: 'Módulos habilitados para la empresa',
    description: 'Devuelve manifests y estado. Los módulos core siempre están activos.',
  })
  @ApiResponse({ status: 200, description: 'Lista de módulos habilitados' })
  @ApiResponse({ status: 400, description: 'Falta x-company-id' })
  async list(@Headers('x-company-id') companyId?: string) {
    if (!companyId) {
      throw new BadRequestException('Falta el header x-company-id');
    }

    return Ok(await this.moduleRegistry.getEnabledModules(companyId));
  }
}
