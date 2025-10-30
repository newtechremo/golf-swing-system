import { Injectable } from '@nestjs/common';
import { ISubjectRepository } from '../../interfaces/repositories/ISubjectRepository';
import { IGolfSwingAnalysisRepository } from '../../interfaces/repositories/IGolfSwingAnalysisRepository';
import { IBodyPostureAnalysisRepository } from '../../interfaces/repositories/IBodyPostureAnalysisRepository';
import {
  SubjectListItemDto,
  GetSubjectsQueryDto,
} from '../../dto/subject/SubjectResponse.dto';

/**
 * 대상자 목록 조회 Use Case
 * 강사의 모든 대상자를 조회하고 각 대상자의 분석 횟수를 포함합니다.
 */
@Injectable()
export class GetSubjectsUseCase {
  constructor(
    private readonly subjectRepository: ISubjectRepository,
    private readonly golfSwingRepository: IGolfSwingAnalysisRepository,
    private readonly postureRepository: IBodyPostureAnalysisRepository,
  ) {}

  async execute(
    userId: number,
    query: GetSubjectsQueryDto,
  ): Promise<{
    subjects: SubjectListItemDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    let subjects = await this.subjectRepository.findByUserId(userId);

    // 상태 필터링
    if (query.status) {
      subjects = subjects.filter((s) => s.status === query.status);
    }

    // 이름 검색
    if (query.search) {
      const searchResults = await this.subjectRepository.searchByName(
        query.search,
        userId,
      );
      const searchIds = new Set(searchResults.map((s) => s.id));
      subjects = subjects.filter((s) => searchIds.has(s.id));
    }

    // 페이지네이션
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;
    const total = subjects.length;

    const paginatedSubjects = subjects.slice(offset, offset + limit);

    // 각 대상자의 분석 횟수 조회
    const subjectListItems: SubjectListItemDto[] = await Promise.all(
      paginatedSubjects.map(async (subject) => {
        const golfSwingAnalyses =
          await this.golfSwingRepository.findBySubject(subject.id);
        const postureAnalyses = await this.postureRepository.findBySubject(
          subject.id,
        );

        return {
          id: subject.id,
          phoneNumber: subject.phoneNumber,
          name: subject.name,
          birthDate: subject.birthDate,
          gender: subject.gender,
          height: subject.height,
          weight: subject.weight,
          status: subject.status,
          createdAt: subject.createdAt,
          analysisCount: {
            golfSwing: golfSwingAnalyses.length,
            posture: postureAnalyses.length,
          },
        };
      }),
    );

    return {
      subjects: subjectListItems,
      total,
      page,
      limit,
    };
  }
}
