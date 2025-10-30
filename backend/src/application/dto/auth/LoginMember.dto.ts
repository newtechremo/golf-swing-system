import { IsString, IsNotEmpty, IsNumber, Matches } from 'class-validator';

export class LoginMemberDto {
  @IsNumber()
  @IsNotEmpty()
  instructorId: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^010-\d{4}-\d{4}$/, {
    message: '전화번호는 010-0000-0000 형식이어야 합니다.',
  })
  phoneNumber: string;
}
