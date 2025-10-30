# Git Branching Strategy - FINEFIT Park Golf

## 브랜치 구조

```
main (프로덕션 배포)
  └── develop (개발 통합)
       ├── feature/entities (완료)
       ├── feature/dtos
       ├── feature/repositories
       ├── feature/use-cases
       ├── feature/controllers
       ├── feature/services-remo
       ├── feature/services-pdf
       └── feature/frontend-*
```

## 브랜치 설명

### 메인 브랜치

#### `main`
- **목적**: 프로덕션 환경에 배포되는 안정적인 코드
- **보호**: 직접 푸시 불가, PR을 통한 병합만 허용
- **배포**: 이 브랜치에서 태그를 생성하여 버전 관리

#### `develop`
- **목적**: 개발 환경의 통합 브랜치
- **사용**: 모든 feature 브랜치는 develop에서 분기하고 develop으로 병합
- **테스트**: 통합 테스트 및 QA가 이루어지는 브랜치

---

## Feature 브랜치

### 백엔드 기능 브랜치

#### `feature/entities` ✅ (완료)
**작업 내용**:
- TypeORM 엔티티 생성
- InstructorEntity (강사)
- SwingTypeEntity (풀스윙/반스윙 구분)
- 기존 엔티티 수정 (User, GolfSwingAnalysis, BodyPostureAnalysis)

**완료된 파일**:
- `backend/src/infrastructure/database/entities/*.entity.ts` (14개 파일)
- `backend/ENTITIES_README.md`

---

#### `feature/dtos`
**작업 내용**:
- 모든 API 요청/응답 DTO 생성
- 강사 인증 DTO
- 회원 관리 DTO
- 골프 스윙 분석 DTO (풀스윙/반스윙)
- 체형 분석 DTO
- PDF 생성 DTO

**예상 파일**:
```
backend/src/application/dto/
  ├── auth/
  │   ├── LoginInstructorDto.ts
  │   ├── LoginMemberDto.ts
  │   └── AuthResponseDto.ts
  ├── member/
  │   ├── CreateMemberDto.ts
  │   ├── UpdateMemberDto.ts
  │   └── MemberResponseDto.ts
  ├── golf-swing/
  │   ├── UploadSwingVideoDto.ts
  │   ├── SwingAnalysisResponseDto.ts
  │   └── SwingFrameControlDto.ts
  ├── posture/
  │   ├── UploadPostureImagesDto.ts
  │   └── PostureAnalysisResponseDto.ts
  └── pdf/
      └── GeneratePdfDto.ts
```

---

#### `feature/repositories`
**작업 내용**:
- TypeORM Repository 패턴 구현
- InstructorRepository
- UserRepository (회원)
- GolfSwingAnalysisRepository
- BodyPostureAnalysisRepository

**예상 파일**:
```
backend/src/infrastructure/database/repositories/
  ├── InstructorRepository.ts
  ├── UserRepository.ts
  ├── GolfSwingAnalysisRepository.ts
  ├── BodyPostureAnalysisRepository.ts
  └── index.ts
```

---

#### `feature/use-cases`
**작업 내용**:
- 비즈니스 로직 구현 (Clean Architecture)
- 강사 인증 Use Cases
- 회원 관리 Use Cases
- 골프 스윙 분석 Use Cases
- 체형 분석 Use Cases
- PDF 생성 Use Cases

**예상 파일**:
```
backend/src/application/use-cases/
  ├── auth/
  │   ├── LoginInstructorUseCase.ts
  │   ├── LoginMemberUseCase.ts
  │   └── RefreshTokenUseCase.ts
  ├── member/
  │   ├── CreateMemberUseCase.ts
  │   ├── GetMemberListUseCase.ts
  │   └── UpdateMemberUseCase.ts
  ├── golf-swing/
  │   ├── UploadSwingVideoUseCase.ts
  │   ├── GetSwingResultUseCase.ts
  │   └── UpdateSwingMemoUseCase.ts
  ├── posture/
  │   ├── AnalyzePostureUseCase.ts
  │   ├── GetPostureResultUseCase.ts
  │   └── UpdatePostureMemoUseCase.ts
  └── pdf/
      └── GeneratePdfUseCase.ts
```

---

#### `feature/controllers`
**작업 내용**:
- NestJS 컨트롤러 생성
- REST API 엔드포인트 구현
- API 문서화 (Swagger)

**예상 파일**:
```
backend/src/presentation/controllers/
  ├── auth.controller.ts
  ├── member.controller.ts
  ├── golf-swing.controller.ts
  ├── posture.controller.ts
  └── pdf.controller.ts
```

---

#### `feature/services-remo`
**작업 내용**:
- REMO API 연동 서비스
- 골프 스윙 분석 API (풀스윙/반스윙)
- 체형 분석 API (A-pose)
- API 에러 핸들링
- 재시도 로직

**예상 파일**:
```
backend/src/infrastructure/external-services/
  ├── REMOApiService.ts
  ├── REMOGolfSwingService.ts
  └── REMOPostureService.ts
```

---

#### `feature/services-pdf`
**작업 내용**:
- PDF 생성 서비스
- 분석 결과지 템플릿
- 차트/그래프 생성
- S3 업로드 연동

**예상 파일**:
```
backend/src/infrastructure/pdf/
  ├── PdfGeneratorService.ts
  ├── templates/
  │   ├── swing-result.template.ts
  │   └── posture-result.template.ts
  └── utils/
      └── chart-generator.ts
```

---

### 프론트엔드 기능 브랜치

#### `feature/frontend-auth`
- 강사 로그인
- 회원 로그인 (전화번호)

#### `feature/frontend-member-management`
- 회원 목록
- 회원 등록/수정

#### `feature/frontend-golf-swing`
- 동영상 업로드
- 풀스윙/반스윙 선택
- 결과 보기 (프레임 컨트롤)
- 메모 작성

#### `feature/frontend-posture`
- A-pose 사진 업로드
- 결과 보기
- 메모 작성

#### `feature/frontend-history`
- 날짜별 분석 이력
- 리스트 형식 히스토리

#### `feature/frontend-pdf`
- PDF 결과지 다운로드

---

## 작업 워크플로우

### 1. 새 기능 시작
```bash
# develop 브랜치로 이동
git checkout develop

# 최신 변경사항 받기
git pull origin develop

# 새 feature 브랜치 생성
git checkout -b feature/브랜치명

# 예: git checkout -b feature/dtos
```

### 2. 작업 중
```bash
# 변경사항 확인
git status

# 파일 추가
git add .

# 커밋
git commit -m "feat: 기능 설명

상세 내용"

# 원격 저장소에 푸시
git push origin feature/브랜치명
```

### 3. 기능 완료
```bash
# develop에 병합
git checkout develop
git merge feature/브랜치명

# 원격에 푸시
git push origin develop

# feature 브랜치 삭제 (선택사항)
git branch -d feature/브랜치명
```

---

## 커밋 메시지 컨벤션

### 형식
```
<type>: <subject>

<body>

<footer>
```

### Type
- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅 (기능 변경 없음)
- `refactor`: 코드 리팩토링
- `test`: 테스트 코드 추가/수정
- `chore`: 빌드 프로세스, 도구 설정 등

### 예시
```bash
# 좋은 예
git commit -m "feat: InstructorEntity 추가

강사 엔티티 생성
- 결제 타입 (무료/유료)
- 인증 강사 여부
- 구독 정보"

git commit -m "feat: 풀스윙/반스윙 프레임 저장 로직 추가"

git commit -m "fix: 회원 전화번호 중복 검증 오류 수정"
```

---

## 현재 상태

✅ **완료**:
- Git 저장소 초기화
- .gitignore 설정
- 브랜치 전략 문서 작성

🔄 **진행 중**:
- `feature/entities`: 엔티티 작업 완료, 커밋 예정

📋 **다음 작업**:
1. `feature/entities` 커밋 및 develop 병합
2. `feature/dtos` 브랜치 생성 및 작업 시작

---

## 브랜치 명명 규칙

- `feature/기능명`: 새 기능 개발
- `bugfix/버그명`: 버그 수정
- `hotfix/긴급수정명`: 프로덕션 긴급 수정
- `refactor/리팩토링명`: 코드 리팩토링
- `docs/문서명`: 문서 작업

---

## 주의사항

1. **develop에서 작업하지 말 것**: 항상 feature 브랜치를 생성하여 작업
2. **main에 직접 푸시 금지**: PR을 통해서만 병합
3. **커밋 전 테스트**: 가능한 한 테스트 코드 작성 및 실행
4. **작은 단위로 커밋**: 기능별로 작은 단위로 자주 커밋
5. **의미있는 커밋 메시지**: 나중에 히스토리를 이해할 수 있도록 작성
