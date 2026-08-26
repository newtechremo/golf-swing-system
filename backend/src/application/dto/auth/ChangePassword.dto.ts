import { IsString, IsNotEmpty, MinLength } from 'class-validator';

/**
 * 비밀번호 변경 DTO
 */
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: '현재 비밀번호를 입력해주세요.' })
  currentPassword: string;

  @IsString()
  @IsNotEmpty({ message: '새 비밀번호를 입력해주세요.' })
  @MinLength(6, { message: '새 비밀번호는 최소 6자 이상이어야 합니다.' })
  newPassword: string;
}
