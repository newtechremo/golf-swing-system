import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { ISubjectRepository } from '../../interfaces/repositories/ISubjectRepository';

/**
 * 대상자 삭제 Use Case
 * 실제로는 soft delete (status를 'deleted'로 변경)
 */
@Injectable()
export class DeleteSubjectUseCase {
  constructor(
    @Inject('ISubjectRepository')
    private readonly subjectRepository: ISubjectRepository,
  ) {}

  async execute(userId: number, subjectId: number): Promise<void> {
    // 대상자 조회
    const subject = await this.subjectRepository.findById(subjectId);

    if (!subject) {
      throw new NotFoundException('대상자를 찾을 수 없습니다.');
    }

    // 권한 확인
    if (subject.userId !== userId) {
      throw new ForbiddenException('이 대상자를 삭제할 권한이 없습니다.');
    }

    // Soft delete
    await this.subjectRepository.update(subjectId, {
      status: 'deleted',
    });
  }
}
