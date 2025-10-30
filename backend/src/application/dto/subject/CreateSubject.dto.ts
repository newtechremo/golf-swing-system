import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  Matches,
  IsEmail,
} from 'class-validator';

/**
 * 대상자 생성 DTO
 * 강사가 새로운 분석 대상자를 등록할 때 사용합니다.
 */
export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^010-\d{4}-\d{4}$/, {
    message: '전화번호는 010-0000-0000 형식이어야 합니다.',
  })
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  name: string;

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
}
