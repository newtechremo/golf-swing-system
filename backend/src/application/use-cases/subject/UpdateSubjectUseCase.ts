import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { ISubjectRepository } from '../../interfaces/repositories/ISubjectRepository';
import { UpdateSubjectDto } from '../../dto/subject/UpdateSubject.dto';
import { SubjectResponseDto } from '../../dto/subject/SubjectResponse.dto';

/**
 * 대상자 정보 수정 Use Case
 */
@Injectable()
export class UpdateSubjectUseCase {
  constructor(
    @Inject('ISubjectRepository')
    private readonly subjectRepository: ISubjectRepository,
  ) {}

  async execute(
    userId: number,
    subjectId: number,
    dto: UpdateSubjectDto,
  ): Promise<SubjectResponseDto> {
    // 대상자 조회
    const subject = await this.subjectRepository.findById(subjectId);

    if (!subject) {
      throw new NotFoundException('대상자를 찾을 수 없습니다.');
    }

    // 권한 확인 (자신의 대상자만 수정 가능)
    if (subject.userId !== userId) {
      throw new ForbiddenException('이 대상자를 수정할 권한이 없습니다.');
    }

    // 대상자 정보 수정
    const updateData: any = {};

    if (dto.phoneNumber) updateData.phoneNumber = dto.phoneNumber;
    if (dto.name) updateData.name = dto.name;
    if (dto.birthDate) updateData.birthDate = new Date(dto.birthDate);
    if (dto.gender) updateData.gender = dto.gender;
    if (dto.height !== undefined) updateData.height = dto.height;
    if (dto.weight !== undefined) updateData.weight = dto.weight;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.memo !== undefined) updateData.memo = dto.memo;
    if (dto.status) updateData.status = dto.status;

    const updatedSubject = await this.subjectRepository.update(
      subjectId,
      updateData,
    );

    return {
      id: updatedSubject.id,
      userId: updatedSubject.userId,
      phoneNumber: updatedSubject.phoneNumber,
      name: updatedSubject.name,
      birthDate: updatedSubject.birthDate,
      gender: updatedSubject.gender,
      height: updatedSubject.height,
      weight: updatedSubject.weight,
      email: updatedSubject.email,
      memo: updatedSubject.memo,
      status: updatedSubject.status,
      createdAt: updatedSubject.createdAt,
      updatedAt: updatedSubject.updatedAt,
    };
  }
}
