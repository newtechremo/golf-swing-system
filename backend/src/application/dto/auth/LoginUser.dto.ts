import { IsString, IsNotEmpty, MinLength } from 'class-validator';

/**
 * 강사 로그인 DTO
 */
export class LoginUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
