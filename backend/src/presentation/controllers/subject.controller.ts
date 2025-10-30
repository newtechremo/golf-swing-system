import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateSubjectUseCase } from '../../application/use-cases/subject/CreateSubjectUseCase';
import { UpdateSubjectUseCase } from '../../application/use-cases/subject/UpdateSubjectUseCase';
import { GetSubjectsUseCase } from '../../application/use-cases/subject/GetSubjectsUseCase';
import { GetSubjectDetailUseCase } from '../../application/use-cases/subject/GetSubjectDetailUseCase';
import { DeleteSubjectUseCase } from '../../application/use-cases/subject/DeleteSubjectUseCase';
import { CreateSubjectDto } from '../../application/dto/subject/CreateSubject.dto';
import { UpdateSubjectDto } from '../../application/dto/subject/UpdateSubject.dto';
import { GetSubjectsQueryDto } from '../../application/dto/subject/SubjectResponse.dto';

@Controller('subjects')
@UseGuards(JwtAuthGuard)
export class SubjectController {
  constructor(
    private readonly createSubjectUseCase: CreateSubjectUseCase,
    private readonly updateSubjectUseCase: UpdateSubjectUseCase,
    private readonly getSubjectsUseCase: GetSubjectsUseCase,
    private readonly getSubjectDetailUseCase: GetSubjectDetailUseCase,
    private readonly deleteSubjectUseCase: DeleteSubjectUseCase,
  ) {}

  /**
   * 대상자 목록 조회
   * GET /subjects
   */
  @Get()
  async getSubjects(@Request() req, @Query() query: GetSubjectsQueryDto) {
    const userId = req.user.sub;
    return await this.getSubjectsUseCase.execute(userId, query);
  }

  /**
   * 대상자 상세 조회
   * GET /subjects/:id
   */
  @Get(':id')
  async getSubjectDetail(
    @Request() req,
    @Param('id', ParseIntPipe) subjectId: number,
  ) {
    const userId = req.user.sub;
    return await this.getSubjectDetailUseCase.execute(userId, subjectId);
  }

  /**
   * 대상자 등록
   * POST /subjects
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSubject(@Request() req, @Body() createDto: CreateSubjectDto) {
    const userId = req.user.sub;
    return await this.createSubjectUseCase.execute(userId, createDto);
  }

  /**
   * 대상자 정보 수정
   * PUT /subjects/:id
   */
  @Put(':id')
  async updateSubject(
    @Request() req,
    @Param('id', ParseIntPipe) subjectId: number,
    @Body() updateDto: UpdateSubjectDto,
  ) {
    const userId = req.user.sub;
    return await this.updateSubjectUseCase.execute(userId, subjectId, updateDto);
  }

  /**
   * 대상자 삭제
   * DELETE /subjects/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSubject(
    @Request() req,
    @Param('id', ParseIntPipe) subjectId: number,
  ) {
    const userId = req.user.sub;
    await this.deleteSubjectUseCase.execute(userId, subjectId);
  }
}
