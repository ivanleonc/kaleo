import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

export class SetMemberBranchesDto {
  @ApiProperty({
    type: [String],
    description: 'UUIDs de las sedes asignadas. Lista vacía desactiva el alcance por sede.',
    example: ['a1b2c3d4-e5f6-7890-abcd-ef1234567890'],
  })
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true, message: 'Cada branchId debe ser un UUID válido' })
  branchIds!: string[];
}
