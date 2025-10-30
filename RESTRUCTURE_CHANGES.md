# 시스템 구조 변경 사항 (2025-10-30)

## 변경 이유
기존 구조를 **센터 → 강사 → 대상자 → 분석** 계층으로 재설계하여, 강사가 여러 대상자를 관리하고 분석할 수 있도록 변경했습니다.

---

## 1. 엔티티 구조 변경

### 변경 전 (Old Structure)
```
Center → Instructor (강사)
         ↓
         User (회원/대상자)
         ↓
         Analysis (분석)
```

### 변경 후 (New Structure)
```
Center → User (강사)
         ↓
         Subject (대상자)
         ↓
         Analysis (분석)
```

---

## 2. 주요 엔티티 변경 내역

### 2.1 UserEntity - 강사로 변경 ✨

**역할**: 기존 "회원"이 아닌 **강사**를 나타냅니다.

**주요 필드**:
```typescript
{
  id: number;
  centerId: number;           // 소속 센터
  username: string;           // 로그인 ID
  passwordHash: string;       // 비밀번호
  name: string;              // 이름
  phoneNumber: string;       // 전화번호
  email: string;

  // 결제 및 인증 정보
  paymentType: 'free' | 'paid';
  isCertified: boolean;
  certificationNumber: string;
  certificationDate: Date;

  // 구독 정보
  subscriptionStartDate: Date;
  subscriptionEndDate: Date;

  status: 'active' | 'inactive' | 'suspended';
}
```

**관계**:
- `ManyToOne` → CenterEntity
- `OneToMany` → SubjectEntity (대상자들)
- `OneToMany` → GolfSwingAnalysisEntity
- `OneToMany` → BodyPostureAnalysisEntity

---

### 2.2 SubjectEntity - 새로 생성 🆕

**역할**: 강사가 관리하는 **분석 대상자**

**주요 필드**:
```typescript
{
  id: number;
  userId: number;            // 담당 강사 ID
  name: string;
  phoneNumber: string;
  birthDate: Date;
  gender: 'M' | 'F' | 'Other';
  height: number;
  weight: number;
  email: string;
  memo: string;              // 강사 메모
  profileImageUrl: string;
  status: 'active' | 'inactive' | 'deleted';
}
```

**관계**:
- `ManyToOne` → UserEntity (담당 강사)
- `OneToMany` → GolfSwingAnalysisEntity
- `OneToMany` → BodyPostureAnalysisEntity

---

### 2.3 GolfSwingAnalysisEntity - 관계 변경

**변경 사항**:
```typescript
// Before
{
  userId: number;            // 회원 ID
  instructorId: number;      // 강사 ID
  instructor: InstructorEntity;
  user: UserEntity;
}

// After
{
  subjectId: number;         // 대상자 ID (분석 대상)
  userId: number;            // 강사 ID (담당 강사)
  subject: SubjectEntity;    // 분석 대상자
  user: UserEntity;          // 담당 강사
}
```

---

### 2.4 BodyPostureAnalysisEntity - 관계 변경

**변경 사항**: GolfSwingAnalysisEntity와 동일

---

## 3. DTO 변경 내역

### 3.1 Auth DTOs

| 변경 전 | 변경 후 | 설명 |
|---------|---------|------|
| `LoginInstructorDto` | `LoginUserDto` | 강사 로그인 |
| `LoginMemberDto` | 삭제됨 | 대상자는 로그인하지 않음 |
| `InstructorDto` | `UserDto` | 강사 정보 |
| `MemberDto` | 삭제됨 | |

**LoginUserDto** (강사 로그인):
```typescript
{
  username: string;
  password: string;
}
```

**AuthResponseDto**:
```typescript
{
  accessToken: string;
  refreshToken: string;
  user: UserDto;  // 강사 정보
}
```

---

### 3.2 Subject DTOs (새로 생성)

**CreateSubjectDto** (대상자 등록):
```typescript
{
  phoneNumber: string;  // 010-0000-0000
  name: string;
  birthDate?: string;
  gender?: 'M' | 'F' | 'Other';
  height?: number;
  weight?: number;
  email?: string;
  memo?: string;
}
```

**SubjectResponseDto**:
```typescript
{
  id: number;
  userId: number;       // 담당 강사 ID
  phoneNumber: string;
  name: string;
  birthDate?: Date;
  gender?: 'M' | 'F' | 'Other';
  height?: number;
  weight?: number;
  email?: string;
  memo?: string;
  status: string;
  createdAt: Date;
  updatedAt?: Date;
}
```

**SubjectListItemDto**:
```typescript
{
  id: number;
  phoneNumber: string;
  name: string;
  ...
  analysisCount: {
    golfSwing: number;
    posture: number;
  };
}
```

---

## 4. Repository 변경 내역

### 4.1 Repository 이름 변경

| 변경 전 | 변경 후 | 설명 |
|---------|---------|------|
| `IInstructorRepository` | `IUserRepository` | 강사 리포지토리 |
| `InstructorRepository` | `UserRepository` | |
| `IUserRepository` | `ISubjectRepository` | 대상자 리포지토리 |
| `UserRepository` | `SubjectRepository` | |

---

### 4.2 IUserRepository (강사 리포지토리)

**주요 메서드**:
```typescript
findById(id: number): Promise<UserEntity | null>
findByUsername(username: string): Promise<UserEntity | null>
findByCenterId(centerId: number): Promise<UserEntity[]>
findWithSubjects(id: number): Promise<UserEntity | null>
updateSubscription(id: number, endDate: Date): Promise<UserEntity | null>
```

---

### 4.3 ISubjectRepository (대상자 리포지토리)

**주요 메서드**:
```typescript
findById(id: number): Promise<SubjectEntity | null>
findByPhoneNumber(phoneNumber: string): Promise<SubjectEntity | null>
findByPhoneNumberAndUser(phone: string, userId: number): Promise<SubjectEntity | null>
findByUserId(userId: number): Promise<SubjectEntity[]>  // 강사별 대상자 목록
searchByName(name: string, userId: number): Promise<SubjectEntity[]>
```

---

### 4.4 IGolfSwingAnalysisRepository 변경

**메서드 변경**:
```typescript
// Before
findByUser(userId: number)              // 회원의 분석
findByInstructor(instructorId: number)  // 강사의 분석

// After
findBySubject(subjectId: number)        // 대상자의 분석
findByUser(userId: number)              // 강사의 모든 분석 (모든 대상자)
```

**Calendar 메서드 변경**:
```typescript
// Before
getCalendarData(userId: number, year: number, month: number)

// After
getCalendarData(subjectId: number, year: number, month: number)  // 대상자별
```

---

## 5. 사용 시나리오 변경

### 시나리오 1: 로그인

**변경 전**:
1. 강사 로그인 → `POST /api/auth/instructor/login`
2. 회원 로그인 → `POST /api/auth/member/login` (강사ID + 전화번호)

**변경 후**:
1. 강사 로그인 → `POST /api/auth/login` (username + password)
2. 로그인 후 강사는 자신의 대상자 목록 조회 → `GET /api/subjects`

---

### 시나리오 2: 대상자 관리

**새로운 플로우**:
1. 강사가 새 대상자 등록 → `POST /api/subjects`
2. 대상자 목록 조회 → `GET /api/subjects`
3. 대상자 선택 후 분석 수행
4. 대상자별 분석 이력 조회 → `GET /api/subjects/:id/analyses`

---

### 시나리오 3: 분석 수행

**변경 전**:
```json
POST /api/golf-swing/analyze
{
  "userId": 123,           // 회원 ID
  "instructorId": 1,       // 강사 ID
  "videoFile": "..."
}
```

**변경 후**:
```json
POST /api/golf-swing/analyze
{
  "subjectId": 123,        // 대상자 ID
  // userId는 JWT에서 자동 추출 (로그인한 강사)
  "videoFile": "..."
}
```

---

## 6. API 엔드포인트 변경 (예상)

### 6.1 인증 API

| 메서드 | 변경 전 | 변경 후 |
|--------|---------|---------|
| POST | `/api/auth/instructor/login` | `/api/auth/login` |
| POST | `/api/auth/member/login` | 삭제됨 |

---

### 6.2 대상자 관리 API (신규)

| 메서드 | 엔드포인트 | 설명 |
|--------|------------|------|
| GET | `/api/subjects` | 강사의 대상자 목록 조회 |
| POST | `/api/subjects` | 새 대상자 등록 |
| GET | `/api/subjects/:id` | 대상자 상세 조회 |
| PUT | `/api/subjects/:id` | 대상자 정보 수정 |
| DELETE | `/api/subjects/:id` | 대상자 삭제 |
| GET | `/api/subjects/search?name=xxx` | 대상자 검색 |

---

### 6.3 분석 API

| 메서드 | 변경 전 | 변경 후 |
|--------|---------|---------|
| POST | `/api/golf-swing/analyze` | `/api/golf-swing/analyze` |
| | `{userId, instructorId}` | `{subjectId}` |
| GET | `/api/history?userId=xxx` | `/api/history?subjectId=xxx` |

---

## 7. 프론트엔드 영향

### 7.1 로그인 화면
- 강사 로그인: username + password
- **회원 로그인 화면 삭제**

---

### 7.2 새로운 화면: 대상자 관리
1. **대상자 목록 화면**
   - 강사의 모든 대상자 표시
   - 검색 기능
   - 분석 횟수 표시

2. **대상자 등록 화면**
   - 이름, 전화번호, 생년월일, 성별, 신체 정보 입력
   - 메모 입력란

3. **대상자 선택 → 분석 화면**
   - 대상자를 선택한 후 분석 수행
   - 대상자별 이력 조회

---

### 7.3 분석 화면 변경
- 기존: 회원 선택
- 변경: 대상자 선택

---

### 7.4 히스토리 화면
- 대상자별 필터링
- 캘린더: 대상자별 분석 날짜 표시

---

## 8. 데이터베이스 마이그레이션 가이드

```sql
-- 1. SubjectEntity 테이블 생성
CREATE TABLE subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,  -- 담당 강사 ID
  name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  birth_date DATE,
  gender ENUM('M', 'F', 'Other'),
  height DECIMAL(5,2),
  weight DECIMAL(5,2),
  email VARCHAR(255),
  memo TEXT,
  profile_image_url VARCHAR(500),
  status ENUM('active', 'inactive', 'deleted') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_phone (phone_number),
  INDEX idx_status (status)
);

-- 2. Users 테이블을 Instructors에서 Users로 병합
-- Instructors 테이블의 모든 컬럼을 Users 테이블로 추가

ALTER TABLE users ADD COLUMN username VARCHAR(100) UNIQUE;
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN payment_type ENUM('free', 'paid') DEFAULT 'free';
ALTER TABLE users ADD COLUMN is_certified BOOLEAN DEFAULT FALSE;
-- ... 나머지 필드 추가

-- 3. 기존 회원 데이터를 Subjects로 이동
INSERT INTO subjects (user_id, name, phone_number, birth_date, gender, height, weight, email, status, created_at)
SELECT instructor_id, name, phone_number, birth_date, gender, height, weight, email, status, created_at
FROM users;

-- 4. 분석 테이블 컬럼 변경
ALTER TABLE golf_swing_analyses CHANGE COLUMN user_id subject_id INT NOT NULL;
ALTER TABLE golf_swing_analyses CHANGE COLUMN instructor_id user_id INT NOT NULL;

ALTER TABLE body_posture_analyses CHANGE COLUMN user_id subject_id INT NOT NULL;
ALTER TABLE body_posture_analyses CHANGE COLUMN instructor_id user_id INT NOT NULL;

-- 5. Instructors 테이블 삭제 (Users로 병합 완료 후)
DROP TABLE instructors;
```

---

## 9. 주요 용어 정리

| 한글 | 영문 | 엔티티 | 설명 |
|------|------|--------|------|
| 센터 | Center | CenterEntity | 최상위 조직 |
| 강사 | Instructor / User | UserEntity | 센터 소속 강사 (로그인 가능) |
| 대상자 | Subject | SubjectEntity | 강사가 관리하는 분석 대상자 |
| 분석 | Analysis | GolfSwingAnalysisEntity, BodyPostureAnalysisEntity | 대상자의 분석 결과 |

---

## 10. 체크리스트 - 프론트엔드 개발자

### 필수 변경 사항
- [ ] 로그인 API 엔드포인트 변경 (`/auth/instructor/login` → `/auth/login`)
- [ ] 로그인 응답 데이터 구조 변경 (`instructor` → `user`)
- [ ] 회원 로그인 화면 제거
- [ ] 대상자 관리 화면 추가 (목록, 등록, 수정, 검색)
- [ ] 분석 화면에서 대상자 선택 UI 추가
- [ ] 분석 API 요청 파라미터 변경 (`userId, instructorId` → `subjectId`)
- [ ] 히스토리 조회 시 대상자 필터링 추가
- [ ] 캘린더: 대상자별 분석 날짜 표시

### 새로운 기능
- [ ] 대상자 목록에서 분석 횟수 표시
- [ ] 대상자별 최근 분석 이력 표시
- [ ] 대상자 검색 기능

---

## 11. 문의사항

구조 변경에 대한 문의사항이 있으시면 백엔드 개발팀에 문의해주세요.

**변경일**: 2025-10-30
**문서 버전**: 1.0
