import { Injectable, ConflictException } from '@nestjs/common';
import { ISubjectRepository } from '../../interfaces/repositories/ISubjectRepository';
import { CreateSubjectDto } from '../../dto/subject/CreateSubject.dto';
import { SubjectResponseDto } from '../../dto/subject/SubjectResponse.dto';

/**
 * 대상자 생성 Use Case
 * 강사가 새로운 분석 대상자를 등록합니다.
 */
@Injectable()
export class CreateSubjectUseCase {
  constructor(private readonly subjectRepository: ISubjectRepository) {}

  async execute(
    userId: number,
    dto: CreateSubjectDto,
  ): Promise<SubjectResponseDto> {
    // 같은 강사에게 이미 등록된 전화번호인지 확인
    const existingSubject =
      await this.subjectRepository.findByPhoneNumberAndUser(
        dto.phoneNumber,
        userId,
      );

    if (existingSubject) {
      throw new ConflictException(
        '이미 등록된 전화번호입니다. 대상자 목록에서 확인해주세요.',
      );
    }

    // 대상자 생성
    const subject = await this.subjectRepository.create({
      userId,
      name: dto.name,
      phoneNumber: dto.phoneNumber,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      gender: dto.gender,
      height: dto.height,
      weight: dto.weight,
      email: dto.email,
      memo: dto.memo,
      status: 'active',
    });

    return {
      id: subject.id,
      userId: subject.userId,
      phoneNumber: subject.phoneNumber,
      name: subject.name,
      birthDate: subject.birthDate,
      gender: subject.gender,
      height: subject.height,
      weight: subject.weight,
      email: subject.email,
      memo: subject.memo,
      status: subject.status,
      createdAt: subject.createdAt,
      updatedAt: subject.updatedAt,
    };
  }
}
