import { IsString, IsNotEmpty, MinLength, IsEmail, IsInt, IsOptional } from 'class-validator';

/**
 * 강사 회원가입 DTO
 */
export class RegisterUserDto {
  @IsInt()
  @IsNotEmpty()
  centerId: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(4, { message: '아이디는 4자 이상이어야 합니다' })
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: '비밀번호는 6자 이상이어야 합니다' })
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  @IsOptional()
  email?: string;
}
