import { IsOptional, IsNumber, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 대상자 기본 응답 DTO
 */
export class SubjectResponseDto {
  id: number;
  userId: number; // 담당 강사 ID
  phoneNumber: string;
  name: string;
  birthDate?: Date;
  gender?: 'M' | 'F' | 'Other';
  height?: number;
  weight?: number;
  email?: string;
  memo?: string;
  status: 'active' | 'inactive' | 'deleted';
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * 대상자 목록 아이템 DTO
 */
export class SubjectListItemDto {
  id: number;
  phoneNumber: string;
  name: string;
  birthDate?: Date;
  gender?: 'M' | 'F' | 'Other';
  height?: number;
  weight?: number;
  memo?: string;
  status: 'active' | 'inactive' | 'deleted';
  createdAt: Date;
  analysisCount: {
    golfSwing: number;
    posture: number;
  };
}

/**
 * 대상자 상세 정보 DTO (최근 분석 이력 포함)
 */
export class SubjectDetailDto extends SubjectResponseDto {
  recentAnalyses: {
    golfSwing: Array<{
      id: number;
      date: string;
      swingType: 'full' | 'half';
      status: string;
    }>;
    posture: Array<{
      id: number;
      date: string;
      status: string;
    }>;
  };
}

/**
 * 대상자 목록 조회 쿼리 DTO
 */
export class GetSubjectsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['active', 'inactive', 'deleted'])
  status?: 'active' | 'inactive' | 'deleted';
}
