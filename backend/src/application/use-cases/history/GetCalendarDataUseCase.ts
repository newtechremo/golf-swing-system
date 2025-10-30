import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ISubjectRepository } from '../../interfaces/repositories/ISubjectRepository';
import { IGolfSwingAnalysisRepository } from '../../interfaces/repositories/IGolfSwingAnalysisRepository';
import { IBodyPostureAnalysisRepository } from '../../interfaces/repositories/IBodyPostureAnalysisRepository';

/**
 * 캘린더 데이터 조회 Use Case
 * 대상자의 특정 월의 분석 날짜와 횟수를 조회합니다.
 */
@Injectable()
export class GetCalendarDataUseCase {
  constructor(
    private readonly subjectRepository: ISubjectRepository,
    private readonly golfSwingRepository: IGolfSwingAnalysisRepository,
    private readonly postureRepository: IBodyPostureAnalysisRepository,
  ) {}

  async execute(
    userId: number,
    subjectId: number,
    year: number,
    month: number,
  ) {
    // 대상자 조회 및 권한 확인
    const subject = await this.subjectRepository.findById(subjectId);

    if (!subject) {
      throw new NotFoundException('대상자를 찾을 수 없습니다.');
    }

    if (subject.userId !== userId) {
      throw new ForbiddenException(
        '이 대상자의 캘린더를 조회할 권한이 없습니다.',
      );
    }

    // 골프 스윙 캘린더 데이터
    const golfCalendar = await this.golfSwingRepository.getCalendarData(
      subjectId,
      year,
      month,
    );

    // 신체 자세 캘린더 데이터
    const postureCalendar = await this.postureRepository.getCalendarData(
      subjectId,
      year,
      month,
    );

    // 날짜별로 데이터 통합
    const calendarMap = new Map<
      string,
      { date: string; golfCount: number; postureCount: number; total: number }
    >();

    golfCalendar.forEach((item) => {
      calendarMap.set(item.date, {
        date: item.date,
        golfCount: item.count,
        postureCount: 0,
        total: item.count,
      });
    });

    postureCalendar.forEach((item) => {
      if (calendarMap.has(item.date)) {
        const existing = calendarMap.get(item.date);
        existing.postureCount = item.count;
        existing.total += item.count;
      } else {
        calendarMap.set(item.date, {
          date: item.date,
          golfCount: 0,
          postureCount: item.count,
          total: item.count,
        });
      }
    });

    // 날짜순 정렬
    const calendarData = Array.from(calendarMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    return {
      subject: {
        id: subject.id,
        name: subject.name,
      },
      year,
      month,
      data: calendarData,
    };
  }
}
