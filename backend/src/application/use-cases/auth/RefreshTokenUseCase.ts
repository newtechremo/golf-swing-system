import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenResponseDto } from '../../dto/auth/AuthResponse.dto';

/**
 * Access Token 갱신 Use Case
 */
@Injectable()
export class RefreshTokenUseCase {
  constructor(private readonly jwtService: JwtService) {}

  async execute(refreshToken: string): Promise<RefreshTokenResponseDto> {
    try {
      // Refresh Token 검증
      const payload = this.jwtService.verify(refreshToken);

      // 새로운 Access Token 생성
      const newAccessToken = this.jwtService.sign(
        { sub: payload.sub, role: payload.role },
        { expiresIn: '1h' },
      );

      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      throw new UnauthorizedException('유효하지 않은 Refresh Token입니다.');
    }
  }
}
