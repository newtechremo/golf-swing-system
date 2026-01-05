import { Injectable, BadRequestException, ConflictException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { IUserRepository } from '../../interfaces/repositories/IUserRepository';
import { RegisterUserDto } from '../../dto/auth/RegisterUser.dto';
import { AuthResponseDto, UserDto } from '../../dto/auth/AuthResponse.dto';

/**
 * 강사 회원가입 Use Case
 */
@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(dto: RegisterUserDto): Promise<AuthResponseDto> {
    // 1. 아이디 중복 체크
    const existingUser = await this.userRepository.findByUsername(dto.username);
    if (existingUser) {
      throw new ConflictException('이미 사용 중인 아이디입니다.');
    }

    // 2. 전화번호 중복 체크 (UserEntity에 unique 제약 있음)
    // Repository에 findByPhoneNumber가 없으므로 create 시 DB 에러로 처리됨

    // 3. 비밀번호 해시화
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    // 4. 강사 생성
    try {
      const newUser = await this.userRepository.create({
        centerId: dto.centerId,
        username: dto.username,
        passwordHash: passwordHash,
        name: dto.name,
        phoneNumber: dto.phoneNumber,
        email: dto.email,
        paymentType: 'free', // 기본값: 무료
        isCertified: false,
        status: 'active',
      });

      // 5. JWT 토큰 생성
      const tokens = this.generateTokens(newUser.id);

      // 6. UserDto 생성
      const userDto: UserDto = {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        phoneNumber: newUser.phoneNumber,
        email: newUser.email,
        paymentType: newUser.paymentType,
        isCertified: newUser.isCertified,
        certificationNumber: newUser.certificationNumber,
        subscriptionEndDate: newUser.subscriptionEndDate,
        status: newUser.status,
        centerId: newUser.centerId,
        centerName: undefined, // 회원가입 시에는 center join 안 함
      };

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: userDto,
      };
    } catch (error) {
      // 전화번호 중복 등 DB 제약조건 위반
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.message.includes('phone_number')) {
          throw new ConflictException('이미 사용 중인 전화번호입니다.');
        }
        throw new ConflictException('중복된 정보가 있습니다.');
      }
      throw error;
    }
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
