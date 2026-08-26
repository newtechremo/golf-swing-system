import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('인증 토큰이 필요합니다.');
    }

    const token = authorization.substring(7);

    try {
      const payload = this.jwtService.verify(token);

      // access 토큰만 허용한다.
      // refresh 토큰으로 보호 API 를 호출하는 경로를 차단한다.
      if (payload.type !== 'access') {
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      }

      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
  }
}
