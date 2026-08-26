import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IUserRepository } from '../../interfaces/repositories/IUserRepository';
import { ChangePasswordDto } from '../../dto/auth/ChangePassword.dto';

/**
 * 강사 비밀번호 변경 Use Case
 */
@Injectable()
export class ChangePasswordUseCase {
  /** LoginUserUseCase / 기존 데이터와 동일한 라운드 */
  private static readonly SALT_ROUNDS = 10;

  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: number, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 현재 비밀번호 검증
    const isValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isValid) {
      throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다.');
    }

    // 동일 비밀번호로의 변경은 막는다
    const isSame = await bcrypt.compare(dto.newPassword, user.passwordHash);

    if (isSame) {
      throw new BadRequestException(
        '새 비밀번호가 현재 비밀번호와 동일합니다.',
      );
    }

    const passwordHash = await bcrypt.hash(
      dto.newPassword,
      ChangePasswordUseCase.SALT_ROUNDS,
    );

    await this.userRepository.update(userId, { passwordHash });
  }
}
