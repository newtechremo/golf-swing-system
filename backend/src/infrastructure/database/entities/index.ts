// Export all entities for easy import in TypeORM configuration

export { CenterEntity } from './center.entity';
export { UserEntity } from './user.entity';
export { AdminEntity } from './admin.entity';
export { InstructorEntity } from './instructor.entity';

// Golf Swing Analysis Entities
export { GolfSwingAnalysisEntity } from './golf-swing-analysis.entity';
export { GolfSwingResultEntity } from './golf-swing-result.entity';
export { GolfSwingAngleEntity } from './golf-swing-angle.entity';
export { SwingTypeEntity } from './swing-type.entity';

// Body Posture Analysis Entities
export { BodyPostureAnalysisEntity } from './body-posture-analysis.entity';
export { FrontPostureResultEntity } from './front-posture-result.entity';
export { SidePostureResultEntity } from './side-posture-result.entity';
export { BackPostureResultEntity } from './back-posture-result.entity';

// Notice Entities
export { NoticeEntity } from './notice.entity';
export { NoticeReadEntity } from './notice-read.entity';

// Array of all entities for TypeORM configuration
export const entities = [
  CenterEntity,
  UserEntity,
  AdminEntity,
  InstructorEntity,
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
];
