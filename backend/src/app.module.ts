import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { CenterEntity } from './infrastructure/database/entities/center.entity';
import { AdminEntity } from './infrastructure/database/entities/admin.entity';
import { UserEntity } from './infrastructure/database/entities/user.entity';
import { SubjectEntity } from './infrastructure/database/entities/subject.entity';
import { GolfSwingAnalysisEntity } from './infrastructure/database/entities/golf-swing-analysis.entity';
import { GolfSwingResultEntity } from './infrastructure/database/entities/golf-swing-result.entity';
import { GolfSwingAngleEntity } from './infrastructure/database/entities/golf-swing-angle.entity';
import { SwingTypeEntity } from './infrastructure/database/entities/swing-type.entity';
import { BodyPostureAnalysisEntity } from './infrastructure/database/entities/body-posture-analysis.entity';
import { FrontPostureResultEntity } from './infrastructure/database/entities/front-posture-result.entity';
import { SidePostureResultEntity } from './infrastructure/database/entities/side-posture-result.entity';
import { BackPostureResultEntity } from './infrastructure/database/entities/back-posture-result.entity';
import { NoticeEntity } from './infrastructure/database/entities/notice.entity';
import { NoticeReadEntity } from './infrastructure/database/entities/notice-read.entity';

// Repositories
import { UserRepository } from './infrastructure/database/repositories/UserRepository';
import { SubjectRepository } from './infrastructure/database/repositories/SubjectRepository';
import { GolfSwingAnalysisRepository } from './infrastructure/database/repositories/GolfSwingAnalysisRepository';
import { BodyPostureAnalysisRepository } from './infrastructure/database/repositories/BodyPostureAnalysisRepository';

// Use Cases - Auth
import { LoginUserUseCase } from './application/use-cases/auth/LoginUserUseCase';
import { RefreshTokenUseCase } from './application/use-cases/auth/RefreshTokenUseCase';
import { RegisterUserUseCase } from './application/use-cases/auth/RegisterUserUseCase';

// Use Cases - Subject
import { CreateSubjectUseCase } from './application/use-cases/subject/CreateSubjectUseCase';
import { UpdateSubjectUseCase } from './application/use-cases/subject/UpdateSubjectUseCase';
import { GetSubjectsUseCase } from './application/use-cases/subject/GetSubjectsUseCase';
import { GetSubjectDetailUseCase } from './application/use-cases/subject/GetSubjectDetailUseCase';
import { DeleteSubjectUseCase } from './application/use-cases/subject/DeleteSubjectUseCase';

// Use Cases - Golf Swing
import { UploadSwingVideoUseCase } from './application/use-cases/golf-swing/UploadSwingVideoUseCase';
import { GetSwingAnalysisUseCase } from './application/use-cases/golf-swing/GetSwingAnalysisUseCase';
import { UpdateSwingMemoUseCase } from './application/use-cases/golf-swing/UpdateSwingMemoUseCase';

// Use Cases - Body Posture
import { UploadPostureImagesUseCase } from './application/use-cases/body-posture/UploadPostureImagesUseCase';
import { GetPostureAnalysisUseCase } from './application/use-cases/body-posture/GetPostureAnalysisUseCase';
import { UpdatePostureMemoUseCase } from './application/use-cases/body-posture/UpdatePostureMemoUseCase';

// Use Cases - History
import { GetAnalysisHistoryUseCase } from './application/use-cases/history/GetAnalysisHistoryUseCase';
import { GetCalendarDataUseCase } from './application/use-cases/history/GetCalendarDataUseCase';

// Controllers
import { AuthController } from './presentation/controllers/auth.controller';
import { SubjectController } from './presentation/controllers/subject.controller';
import { GolfSwingController } from './presentation/controllers/golf-swing.controller';
import { BodyPostureController } from './presentation/controllers/body-posture.controller';
import { HistoryController } from './presentation/controllers/history.controller';

// Guards
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';

// External Services
import { S3UploadService } from './infrastructure/external-services/s3-upload.service';
import { RemoApiService } from './infrastructure/external-services/remo-api.service';
import { PdfGenerationService } from './infrastructure/external-services/pdf-generation.service';
import { LocalStorageService } from './infrastructure/external-services/local-storage.service';

// Infrastructure Services
import { GolfSwingScoreService } from './infrastructure/services/golf-swing-score.service';

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 3306),
        username: configService.get('DB_USERNAME', 'root'),
        password: configService.get('DB_PASSWORD', ''),
        database: configService.get('DB_DATABASE', 'golf_swing_system'),
        timezone: '+09:00', // KST timezone
        entities: [
          CenterEntity,
          AdminEntity,
          UserEntity,
          SubjectEntity,
          GolfSwingAnalysisEntity,
          GolfSwingResultEntity,
          GolfSwingAngleEntity,
          SwingTypeEntity,
          BodyPostureAnalysisEntity,
          FrontPostureResultEntity,
          SidePostureResultEntity,
          BackPostureResultEntity,
          NoticeEntity,
          NoticeReadEntity,
        ],
        // WARNING: dropSchema will delete all data! Remove after first run.
        dropSchema: configService.get('DB_DROP_SCHEMA') === 'true',
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: ['error'],
      }),
      inject: [ConfigService],
    }),

    // TypeORM repositories
    TypeOrmModule.forFeature([
      CenterEntity,
      AdminEntity,
      UserEntity,
      SubjectEntity,
      GolfSwingAnalysisEntity,
      GolfSwingResultEntity,
      GolfSwingAngleEntity,
      SwingTypeEntity,
      BodyPostureAnalysisEntity,
      FrontPostureResultEntity,
      SidePostureResultEntity,
      BackPostureResultEntity,
      NoticeEntity,
      NoticeReadEntity,
    ]),

    // JWT configuration
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET', 'your-secret-key'),
        signOptions: {
          expiresIn: '1h',
        },
      }),
      inject: [ConfigService],
      global: true,
    }),

    // Scheduler for periodic tasks (file cleanup)
    ScheduleModule.forRoot(),
  ],
  controllers: [
    AuthController,
    SubjectController,
    GolfSwingController,
    BodyPostureController,
    HistoryController,
  ],
  providers: [
    // Repository providers with injection tokens
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
    {
      provide: 'ISubjectRepository',
      useClass: SubjectRepository,
    },
    {
      provide: 'IGolfSwingAnalysisRepository',
      useClass: GolfSwingAnalysisRepository,
    },
    {
      provide: 'IBodyPostureAnalysisRepository',
      useClass: BodyPostureAnalysisRepository,
    },

    // Use Cases - Auth
    LoginUserUseCase,
    RefreshTokenUseCase,
    RegisterUserUseCase,

    // Use Cases - Subject
    CreateSubjectUseCase,
    UpdateSubjectUseCase,
    GetSubjectsUseCase,
    GetSubjectDetailUseCase,
    DeleteSubjectUseCase,

    // Use Cases - Golf Swing
    UploadSwingVideoUseCase,
    GetSwingAnalysisUseCase,
    UpdateSwingMemoUseCase,

    // Use Cases - Body Posture
    UploadPostureImagesUseCase,
    GetPostureAnalysisUseCase,
    UpdatePostureMemoUseCase,

    // Use Cases - History
    GetAnalysisHistoryUseCase,
    GetCalendarDataUseCase,

    // External Services
    S3UploadService,
    LocalStorageService,
    RemoApiService,
    PdfGenerationService,

    // Infrastructure Services
    GolfSwingScoreService,

    // Guards
    JwtAuthGuard,
  ],
})
export class AppModule {}
