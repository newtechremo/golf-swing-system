import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  Request,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { LoginUserUseCase } from '../../application/use-cases/auth/LoginUserUseCase';
import { RefreshTokenUseCase } from '../../application/use-cases/auth/RefreshTokenUseCase';
import { RegisterUserUseCase } from '../../application/use-cases/auth/RegisterUserUseCase';
import { LoginUserDto } from '../../application/dto/auth/LoginUser.dto';
import { RegisterUserDto } from '../../application/dto/auth/RegisterUser.dto';
import { ChangePasswordUseCase } from '../../application/use-cases/auth/ChangePasswordUseCase';
import { ChangePasswordDto } from '../../application/dto/auth/ChangePassword.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
  ) {}

  /**
   * 강사 회원가입
   * POST /auth/register
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterUserDto) {
    return await this.registerUserUseCase.execute(registerDto);
  }

  /**
   * 강사 로그인
   * POST /auth/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginUserDto) {
    return await this.loginUserUseCase.execute(loginDto);
  }

  /**
   * Access Token 갱신
   * POST /auth/refresh
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Headers('authorization') authorization: string) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Refresh Token이 필요합니다.');
    }

    const refreshToken = authorization.substring(7);
    return await this.refreshTokenUseCase.execute(refreshToken);
  }

  /**
   * 비밀번호 변경
   * POST /auth/change-password
   */
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.changePasswordUseCase.execute(req.user.sub, dto);
    return { message: '비밀번호가 변경되었습니다.' };
  }
}
