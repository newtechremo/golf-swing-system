import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  IsEmail,
} from 'class-validator';

/**
 * 대상자 정보 수정 DTO
 */
export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsEnum(['M', 'F', 'Other'])
  gender?: 'M' | 'F' | 'Other';

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  memo?: string;

  @IsOptional()
  @IsEnum(['active', 'inactive', 'deleted'])
  status?: 'active' | 'inactive' | 'deleted';
}
