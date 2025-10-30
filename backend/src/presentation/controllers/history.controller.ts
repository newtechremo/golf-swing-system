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
    @Query('page', ParseIntPipe) page?: number,
    @Query('limit', ParseIntPipe) limit?: number,
  ) {
    const userId = req.user.sub;
    return await this.getAnalysisHistoryUseCase.execute(userId, subjectId, {
      type,
      startDate,
      endDate,
      page,
      limit,
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
