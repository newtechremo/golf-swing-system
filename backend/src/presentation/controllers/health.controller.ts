import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * 헬스체크 엔드포인트
 *
 * 인증을 요구하지 않는다. 배포 스크립트와 외부 모니터링이 이 엔드포인트를 사용한다.
 * 프로세스 생존만이 아니라 DB 연결까지 확인한다 —
 * 2026-06-15 사고 때 "PM2 online" 이지만 DB 연결 실패로 실제 서비스가
 * 2.4개월간 죽어 있었고, 아무도 이를 감지하지 못했다.
 */
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Get()
  async check() {
    let db: 'up' | 'down' = 'down';

    try {
      await this.dataSource.query('SELECT 1');
      db = 'up';
    } catch {
      db = 'down';
    }

    return {
      status: db === 'up' ? 'ok' : 'degraded',
      db,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
