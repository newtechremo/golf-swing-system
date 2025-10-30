# TypeORM Entities Documentation

## 개요

이 문서는 Golf Swing & Body Posture Analysis System의 TypeORM 엔티티 구조를 설명합니다.

## 엔티티 구조

### 1. 기본 엔티티

#### CenterEntity
센터(시설) 정보를 저장하는 엔티티

**파일**: `center.entity.ts`

**주요 필드**:
- `id`: 고유 식별자
- `name`: 센터 이름
- `code`: 센터 코드 (unique)
- `address`: 주소
- `contact`: 연락처
- `status`: 상태 (active, inactive)

**관계**:
- `users`: OneToMany → UserEntity
- `admins`: OneToMany → AdminEntity

---

#### UserEntity
사용자 정보를 저장하는 엔티티

**파일**: `user.entity.ts`

**주요 필드**:
- `id`: 고유 식별자
- `centerId`: 소속 센터 ID
- `phoneNumber`: 휴대폰 번호 (unique, 로그인 ID)
- `name`: 사용자 이름
- `birthDate`: 생년월일
- `gender`: 성별 (M, F, Other)
- `height`: 키 (cm)
- `weight`: 몸무게 (kg)
- `email`: 이메일
- `status`: 상태 (active, inactive, deleted)
- `lastLoginAt`: 마지막 로그인 시간

**관계**:
- `center`: ManyToOne → CenterEntity
- `golfSwingAnalyses`: OneToMany → GolfSwingAnalysisEntity
- `bodyPostureAnalyses`: OneToMany → BodyPostureAnalysisEntity
- `noticeReads`: OneToMany → NoticeReadEntity

---

#### AdminEntity
관리자 정보를 저장하는 엔티티

**파일**: `admin.entity.ts`

**주요 필드**:
- `id`: 고유 식별자
- `username`: 사용자명 (unique)
- `passwordHash`: 암호화된 비밀번호
- `name`: 관리자 이름
- `email`: 이메일
- `role`: 역할 (super_admin, center_admin)
- `centerId`: 소속 센터 ID (center_admin인 경우)
- `status`: 상태 (active, inactive)
- `lastLoginAt`: 마지막 로그인 시간

**관계**:
- `center`: ManyToOne → CenterEntity
- `notices`: OneToMany → NoticeEntity

---

### 2. 골프 스윙 분석 엔티티

#### GolfSwingAnalysisEntity
골프 스윙 분석의 기본 정보를 저장하는 엔티티

**파일**: `golf-swing-analysis.entity.ts`

**주요 필드**:
- `id`: 고유 식별자
- `userId`: 사용자 ID
- `uuid`: REMO API UUID (unique)
- `analysisDate`: 분석 날짜
- `height`: 분석 시 입력한 키
- `videoUrl`: 동영상 URL
- `videoS3Key`: S3 저장 키
- `status`: 분석 상태 (pending, processing, completed, failed)
- `waitTime`: 분석 대기 시간 (초)
- `creditUsed`: 사용된 크레딧
- `memo`: 메모

**관계**:
- `user`: ManyToOne → UserEntity
- `result`: OneToOne → GolfSwingResultEntity
- `angle`: OneToOne → GolfSwingAngleEntity

---

#### GolfSwingResultEntity
골프 스윙 분석의 상세 결과를 저장하는 엔티티

**파일**: `golf-swing-result.entity.ts`

**주요 필드** (8단계 스윙 분석):

1. **Address (어드레스)**:
   - `addressFrame`: 프레임 번호
   - `addressStance`: 스탠스 (AnkleShoulderRatio)
   - `addressUpperBodyTilt`: 상체 기울기 (HipNeckRatio)
   - `addressShoulderTilt`: 어깨 기울기
   - `addressHeadLocation`: 머리 위치

2. **Takeback (테이크백)**:
   - `takebackFrame`: 프레임 번호
   - `takebackLeftShoulderRotation`: 왼쪽 어깨 회전
   - `takebackRightHipRotation`: 오른쪽 골반 회전
   - `takebackLeftArmFlexion`: 왼팔 굴곡
   - `takebackRightArmFlexion`: 오른팔 굴곡

3. **Backswing (백스윙)**:
   - `backswingFrame`: 프레임 번호
   - `backswingHeadLocation`: 머리 위치
   - `backswingLeftShoulderRotation`: 왼쪽 어깨 회전
   - `backswingLeftArmFlexion`: 왼팔 굴곡

4. **Backswing Top (백스윙 탑)**:
   - `backswingTopFrame`: 프레임 번호
   - `backswingTopReverseSpine`: 역 척추
   - `backswingTopRightHipRotation`: 오른쪽 골반 회전
   - `backswingTopRightLegFlexion`: 오른쪽 다리 굴곡
   - `backswingTopCenterOfGravity`: 무게 중심

5. **Downswing (다운스윙)**:
   - `downswingFrame`: 프레임 번호
   - `downswingLeftShoulderRotation`: 왼쪽 어깨 회전
   - `downswingRightHipRotation`: 오른쪽 골반 회전
   - `downswingLeftArmFlexion`: 왼팔 굴곡

6. **Impact (임팩트)**:
   - `impactFrame`: 프레임 번호
   - `impactHeadLocation`: 머리 위치
   - `impactLeftArmFlexion`: 왼팔 굴곡
   - `impactHipRotation`: 골반 회전

7. **Follow-through (팔로우스루)**:
   - `followthroughFrame`: 프레임 번호
   - `followthroughHipRotation`: 골반 회전
   - `followthroughShoulderRotation`: 어깨 회전

8. **Finish (피니시)**:
   - `finishFrame`: 프레임 번호
   - `finishCenterOfGravity`: 무게 중심
   - `finishUpperBodyTilt`: 상체 기울기

**관계**:
- `analysis`: OneToOne → GolfSwingAnalysisEntity

---

#### GolfSwingAngleEntity
골프 스윙의 프레임별 각도 데이터를 저장하는 엔티티

**파일**: `golf-swing-angle.entity.ts`

**주요 필드**:
- `id`: 고유 식별자
- `analysisId`: 분석 ID
- `kneeLineData`: 무릎 각도 데이터 (JSON - [[x, y, z], ...])
- `pelvisData`: 골반 각도 데이터 (JSON - [[x, y, z], ...])
- `shoulderLineData`: 어깨 각도 데이터 (JSON - [[x, y, z], ...])

**데이터 형식**:
```typescript
// 각 데이터는 프레임별 x, y, z 축 회전 각도 (degree)
kneeLineData: [[0.0, -1.657, 2.209], [0.0, -2.5, 3.1], ...]
```

**관계**:
- `analysis`: OneToOne → GolfSwingAnalysisEntity

---

### 3. 체형 분석 엔티티

#### BodyPostureAnalysisEntity
체형 분석의 기본 정보를 저장하는 엔티티

**파일**: `body-posture-analysis.entity.ts`

**주요 필드**:
- `id`: 고유 식별자
- `userId`: 사용자 ID
- `analysisDate`: 분석 날짜
- `frontImageUrl`: 정면 이미지 URL
- `frontImageS3Key`: 정면 이미지 S3 키
- `sideImageUrl`: 측면 이미지 URL
- `sideImageS3Key`: 측면 이미지 S3 키
- `backImageUrl`: 후면 이미지 URL
- `backImageS3Key`: 후면 이미지 S3 키
- `frontStatus`: 정면 분석 상태 (pending, completed, failed)
- `sideStatus`: 측면 분석 상태
- `backStatus`: 후면 분석 상태
- `frontUuid`: REMO API UUID (정면)
- `sideUuid`: REMO API UUID (측면)
- `backUuid`: REMO API UUID (후면)
- `memo`: 메모

**관계**:
- `user`: ManyToOne → UserEntity
- `frontResult`: OneToOne → FrontPostureResultEntity
- `sideResult`: OneToOne → SidePostureResultEntity
- `backResult`: OneToOne → BackPostureResultEntity

---

#### FrontPostureResultEntity
정면 체형 분석 결과를 저장하는 엔티티

**파일**: `front-posture-result.entity.ts`

**측정 항목** (모두 degree 단위):
- `headBalanceValue`: 머리 균형 측정값
- `headBalanceGrade`: 머리 균형 등급 (-2 ~ 2)
- `pelvicBalanceValue`: 골반 균형 측정값
- `pelvicBalanceGrade`: 골반 균형 등급
- `shoulderBalanceValue`: 어깨 균형 측정값
- `shoulderBalanceGrade`: 어깨 균형 등급
- `kneeBalanceValue`: 무릎 균형 측정값
- `kneeBalanceGrade`: 무릎 균형 등급
- `bodyTiltValue`: 전신 기울기 측정값
- `bodyTiltGrade`: 전신 기울기 등급
- `leftLegQAngleValue`: 왼쪽 다리 Q각 측정값
- `leftLegQAngleGrade`: 왼쪽 다리 Q각 등급
- `rightLegQAngleValue`: 오른쪽 다리 Q각 측정값
- `rightLegQAngleGrade`: 오른쪽 다리 Q각 등급

**추가 필드**:
- `skeletonCoords`: 골격 좌표 데이터 (JSON)
- `resultImageUrl`: 결과 이미지 URL

**등급 기준**:
- -2: 위험 (왼쪽으로 심하게 기울어짐)
- -1: 주의 (왼쪽으로 기울어짐)
- 0: 정상
- 1: 주의 (오른쪽으로 기울어짐)
- 2: 위험 (오른쪽으로 심하게 기울어짐)

**관계**:
- `postureAnalysis`: OneToOne → BodyPostureAnalysisEntity

---

#### SidePostureResultEntity
측면 체형 분석 결과를 저장하는 엔티티

**파일**: `side-posture-result.entity.ts`

**측정 항목** (모두 degree 단위):
- `roundShoulderValue`: 라운드 숄더 측정값
- `roundShoulderGrade`: 라운드 숄더 등급 (0: 정상, 1: 주의, 2: 위험)
- `turtleNeckValue`: 거북목 측정값
- `turtleNeckGrade`: 거북목 등급
- `headTiltValue`: 머리 기울기 측정값
- `headTiltGrade`: 머리 기울기 등급 (-2 ~ 2)
- `bodyTiltValue`: 전후 기울기 측정값
- `bodyTiltGrade`: 전후 기울기 등급

**추가 필드**:
- `skeletonCoords`: 골격 좌표 데이터 (JSON)
- `resultImageUrl`: 결과 이미지 URL

**관계**:
- `postureAnalysis`: OneToOne → BodyPostureAnalysisEntity

---

#### BackPostureResultEntity
후면 체형 분석 결과를 저장하는 엔티티

**파일**: `back-posture-result.entity.ts`

**측정 항목**:
FrontPostureResultEntity와 동일한 구조:
- 머리 균형, 골반 균형, 어깨 균형
- 무릎 균형, 전신 기울기
- 좌/우 다리 각도

**관계**:
- `postureAnalysis`: OneToOne → BodyPostureAnalysisEntity

---

### 4. 공지사항 엔티티

#### NoticeEntity
공지사항 정보를 저장하는 엔티티

**파일**: `notice.entity.ts`

**주요 필드**:
- `id`: 고유 식별자
- `title`: 제목
- `content`: 내용
- `authorId`: 작성자 ID (관리자)
- `priority`: 우선순위 (low, normal, high)
- `status`: 상태 (draft, published, archived)
- `publishedAt`: 게시 일시

**관계**:
- `author`: ManyToOne → AdminEntity
- `reads`: OneToMany → NoticeReadEntity

---

#### NoticeReadEntity
공지사항 읽음 표시를 저장하는 엔티티

**파일**: `notice-read.entity.ts`

**주요 필드**:
- `id`: 고유 식별자
- `noticeId`: 공지사항 ID
- `userId`: 사용자 ID
- `readAt`: 읽은 시간

**Unique 제약 조건**:
- (noticeId, userId) - 한 사용자가 같은 공지를 여러 번 읽음 표시할 수 없음

**관계**:
- `notice`: ManyToOne → NoticeEntity
- `user`: ManyToOne → UserEntity

---

## 데이터베이스 관계 다이어그램

```
CenterEntity
    ├─ (1:N) → UserEntity
    │            ├─ (1:N) → GolfSwingAnalysisEntity
    │            │            ├─ (1:1) → GolfSwingResultEntity
    │            │            └─ (1:1) → GolfSwingAngleEntity
    │            │
    │            ├─ (1:N) → BodyPostureAnalysisEntity
    │            │            ├─ (1:1) → FrontPostureResultEntity
    │            │            ├─ (1:1) → SidePostureResultEntity
    │            │            └─ (1:1) → BackPostureResultEntity
    │            │
    │            └─ (1:N) → NoticeReadEntity
    │
    └─ (1:N) → AdminEntity
                 └─ (1:N) → NoticeEntity
                              └─ (1:N) → NoticeReadEntity
```

---

## 사용 방법

### TypeORM 설정에 엔티티 추가

```typescript
import { TypeOrmModule } from '@nestjs/typeorm';
import { entities } from './infrastructure/database/entities';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'user',
      password: 'password',
      database: 'golf_swing_db',
      entities: entities,
      synchronize: false, // 프로덕션에서는 false
    }),
  ],
})
export class AppModule {}
```

### 개별 엔티티 import

```typescript
import {
  UserEntity,
  GolfSwingAnalysisEntity,
  BodyPostureAnalysisEntity
} from './infrastructure/database/entities';
```

### Repository 사용

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './infrastructure/database/entities';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async findByPhoneNumber(phoneNumber: string): Promise<UserEntity> {
    return this.repository.findOne({
      where: { phoneNumber },
      relations: ['center']
    });
  }
}
```

---

## 주의사항

1. **Cascade 옵션**:
   - GolfSwingAnalysisEntity의 result와 angle은 cascade: true
   - BodyPostureAnalysisEntity의 결과 엔티티들도 cascade: true
   - 분석 삭제 시 관련 결과도 함께 삭제됨

2. **onDelete 옵션**:
   - 결과 엔티티들은 onDelete: 'CASCADE' 설정
   - 부모 삭제 시 자동으로 삭제됨

3. **JSON 타입**:
   - MySQL 5.7.8 이상 필요
   - 각도 데이터와 좌표 데이터는 JSON 타입으로 저장

4. **Index**:
   - 자주 검색되는 필드에 @Index() 데코레이터 적용
   - 성능 최적화를 위해 복합 인덱스 고려

5. **Decimal 타입**:
   - 측정값은 decimal(10, 3) 사용
   - 소수점 3자리까지 정확한 값 저장

---

## 마이그레이션

엔티티 변경 시 마이그레이션 생성:

```bash
npm run typeorm:migration:generate -- -n MigrationName
npm run typeorm:migration:run
```

또는 초기 설정 시 database-schema.sql 사용:

```bash
mysql -u root -p golf_swing_db < database-schema.sql
```
