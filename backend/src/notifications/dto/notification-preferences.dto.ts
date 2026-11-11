import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsString,
  ValidateNested,
} from 'class-validator';
import { NOTIFICATION_CATEGORIES } from '../notifications.types.js';

const CATEGORY_CODES = NOTIFICATION_CATEGORIES.map((category) => category.code);

export class NotificationPreferenceDto {
  @ApiProperty({ enum: CATEGORY_CODES })
  @IsString()
  @IsIn(CATEGORY_CODES)
  category!: string;

  @ApiProperty()
  @IsBoolean()
  inApp!: boolean;

  @ApiProperty()
  @IsBoolean()
  email!: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ type: [NotificationPreferenceDto] })
  @IsArray()
  @ArrayMaxSize(CATEGORY_CODES.length)
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceDto)
  preferences!: NotificationPreferenceDto[];
}
