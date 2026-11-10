import { BadRequestException, Controller, Get, Headers } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EntitlementService } from './entitlement.service.js';
import { Ok } from '../../common/dto/api-response.dto.js';

@ApiTags('Entitlements')
@ApiBearerAuth()
@Controller('api/entitlements')
export class EntitlementController {
  constructor(private readonly entitlements: EntitlementService) {}

  @Get()
  @ApiHeader({ name: 'x-company-id', description: 'UUID de la empresa activa', required: true })
  @ApiOperation({
    summary: 'Plan, módulos, límites y consumo de la empresa',
    description: 'Los core siempre están incluidos; el plan aporta módulos y límites.',
  })
  @ApiResponse({ status: 200, description: 'Snapshot de entitlements' })
  @ApiResponse({ status: 400, description: 'Falta x-company-id' })
  async snapshot(@Headers('x-company-id') companyId?: string) {
    if (!companyId) {
      throw new BadRequestException('Falta el header x-company-id');
    }

    return Ok(await this.entitlements.getSnapshot(companyId));
  }
}
