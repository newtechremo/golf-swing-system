import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS - 허용 origin 을 환경변수로 제한한다.
  // Vercel 이전 후 백엔드가 인터넷에 직접 노출되므로 반드시 좁혀야 한다.
  // CORS_ORIGINS 미설정 시에는 기존 동작(모두 허용)을 유지해 로컬 개발을 막지 않는다.
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    // 브라우저는 CORS 응답에서 안전 목록에 있는 헤더만 JS 에 넘겨준다.
    // Content-Disposition 은 그 목록에 없어서, 명시하지 않으면
    // 결과서 다운로드 시 프론트가 서버가 정한 파일명을 읽지 못한다.
    exposedHeaders: ['Content-Disposition'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 4000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
}

bootstrap();
