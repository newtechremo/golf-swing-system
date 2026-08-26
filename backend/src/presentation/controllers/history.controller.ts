import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GetAnalysisHistoryUseCase } from '../../application/use-cases/history/GetAnalysisHistoryUseCase';
import { GetCalendarDataUseCase } from '../../application/use-cases/history/GetCalendarDataUseCase';

@Controller('history')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(
    private readonly getAnalysisHistoryUseCase: GetAnalysisHistoryUseCase,
    private readonly getCalendarDataUseCase: GetCalendarDataUseCase,
  ) {}

  /**
   * 대상자 분석 이력 조회
   * GET /history/subject/:subjectId
   */
  @Get('subject/:subjectId')
  async getHistory(
    @Request() req,
    @Param('subjectId', ParseIntPipe) subjectId: number,
    @Query('type') type?: 'golf' | 'posture' | 'all',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    // page/limit 은 선택 파라미터이며 프론트(lib/history.ts)는 값이 있을 때만 붙인다.
    //
    // 여기에 ParseIntPipe 를 걸면 안 된다. main.ts 의 전역 ValidationPipe 가
    // transform:true 로 먼저 실행되는데, 파라미터 타입이 number 면
    // transformPrimitive 가 `+undefined` → NaN 으로 바꾼다.
    // 그 뒤 ParseIntPipe 는 NaN 을 받으므로 optional:true 로도 통과하지 못하고
    // "Validation failed (numeric string is expected)" 400 이 된다.
    //
    // string 으로 받아 직접 파싱하면 전역 파이프가 값을 건드리지 않는다.
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.sub;
    const toPositiveInt = (v?: string): number | undefined => {
      if (!v) return undefined;
      const n = Number.parseInt(v, 10);
      return Number.isInteger(n) && n > 0 ? n : undefined;
    };

    return await this.getAnalysisHistoryUseCase.execute(userId, subjectId, {
      type,
      startDate,
      endDate,
      page: toPositiveInt(page),
      limit: toPositiveInt(limit),
    });
  }

  /**
   * 대상자 캘린더 데이터 조회
   * GET /history/subject/:subjectId/calendar
   */
  @Get('subject/:subjectId/calendar')
  async getCalendar(
    @Request() req,
    @Param('subjectId', ParseIntPipe) subjectId: number,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    const userId = req.user.sub;
    return await this.getCalendarDataUseCase.execute(
      userId,
      subjectId,
      year,
      month,
    );
  }
}
