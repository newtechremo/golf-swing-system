import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { IUserRepository } from '../../interfaces/repositories/IUserRepository';
import { LoginUserDto } from '../../dto/auth/LoginUser.dto';
import { AuthResponseDto, UserDto } from '../../dto/auth/AuthResponse.dto';

/**
 * 강사 로그인 Use Case
 */
@Injectable()
export class LoginUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(dto: LoginUserDto): Promise<AuthResponseDto> {
    // 이메일로 강사 조회
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('잘못된 이메일 또는 비밀번호입니다.');
    }

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('잘못된 이메일 또는 비밀번호입니다.');
    }

    // 계정 상태 확인
    if (user.status === 'suspended') {
      throw new UnauthorizedException('계정이 정지되었습니다. 관리자에게 문의하세요.');
    }

    if (user.status === 'inactive') {
      throw new UnauthorizedException('비활성화된 계정입니다.');
    }

    // 유료 강사의 구독 만료 확인
    if (user.paymentType === 'paid') {
      const now = new Date();
      if (user.subscriptionEndDate && user.subscriptionEndDate < now) {
        throw new UnauthorizedException('구독이 만료되었습니다. 구독을 갱신해주세요.');
      }
    }

    // 마지막 로그인 시간 업데이트
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

    // JWT 토큰 생성
    const tokens = this.generateTokens(user.id);

    // UserDto 생성
    const userDto: UserDto = {
      id: user.id,
      username: user.username,
      name: user.name,
      phoneNumber: user.phoneNumber,
      email: user.email,
      paymentType: user.paymentType,
      isCertified: user.isCertified,
      certificationNumber: user.certificationNumber,
      subscriptionEndDate: user.subscriptionEndDate,
      status: user.status,
      centerId: user.centerId,
      centerName: user.center?.name,
    };

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: userDto,
    };
  }

  private generateTokens(userId: number): {
    accessToken: string;
    refreshToken: string;
  } {
    const payload = { sub: userId, role: 'instructor' };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
    };
  }
}
