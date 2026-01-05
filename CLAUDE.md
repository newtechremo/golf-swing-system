# Claude 작업 규칙

> **중요**: 모든 작업 시 이 규칙을 따릅니다.

---

## 1. 작업 시작 시 필수 확인

```
1. CURRENT_STATUS.md 읽기 - 프로젝트 현재 상태 파악
2. .claude/WORK_LOG.md 읽기 - 진행 중인 작업 및 미해결 이슈 확인
3. 작업 시작 기록 - WORK_LOG.md에 "현재 진행 중인 작업" 업데이트
```

---

## 2. 작업 중 기록

### 진행 상황 기록 위치
- **간단한 작업**: WORK_LOG.md의 "현재 진행 중인 작업" 섹션
- **중요한 변경**: CURRENT_STATUS.md 해당 섹션 업데이트

### 기록 형식
```markdown
### [YYYY-MM-DD HH:MM] 작업명
- 진행: 현재 진행 중인 내용
- 다음: 다음 단계
```

---

## 3. 작업 완료 시 기록

### 정상 완료
```markdown
### [YYYY-MM-DD] 작업명
- **작업 내용**: 수행한 작업 요약
- **결과**: 결과물 또는 변경사항
- **수정 파일**: 변경된 파일 목록
```

### 이슈 해결 시 (압축 기록)
```markdown
### [YYYY-MM-DD] 이슈 ID: 제목
- **문제**: 1줄 요약
- **원인**: 근본 원인
- **해결**: 수정 내용 (코드 스니펫 포함 가능)
- **파일**: 수정된 파일
```

---

## 4. 프로젝트 핵심 정보

### 서버 포트 (고정 - 변경 금지)
| 서버 | 포트 | URL |
|------|------|-----|
| Backend | 3003 | http://localhost:3003/api |
| Frontend | 3000 | http://localhost:3000 |
| MySQL | 3306 | localhost |

### 테스트 계정
```
Email: instructor001@golf.com
Password: Test1234!
```

### 기술 스택
- **Backend**: NestJS + TypeORM + MySQL
- **Frontend**: Next.js 16 + React 19 + Tailwind CSS
- **외부 API**: REMO API (골프/체형 분석)

### 아키텍처
```
Clean Architecture:
presentation/ → application/ → infrastructure/
(Controllers)   (Use Cases)    (Repositories, Services)
```

---

## 5. 파일 구조

```
golf_swing_system/
├── CLAUDE.md              # 이 파일 (작업 규칙)
├── CURRENT_STATUS.md      # 프로젝트 상태 문서
├── .claude/
│   ├── settings.json      # 프로젝트 설정
│   └── WORK_LOG.md        # 작업 로그
├── backend/               # NestJS 백엔드
└── frontend/              # Next.js 프론트엔드
```

---

## 6. 미해결 이슈 요약

### Critical (1개)
- **C-01**: 체형 분석 이미지 필드 부족 (0/3 → 3개 필요)

### Major (4개)
- **M-01**: 로그인 후 리다이렉트 실패
- **M-02**: 회원 목록 렌더링 이슈
- **M-03**: 스윙 타입 옵션 부족
- **M-04**: 키 입력 필드 누락

### Minor (4개)
- **m-01~04**: UI 요소 표시 문제

---

## 7. 실행 명령어

### 백엔드
```bash
cd backend
npm run build && npm run start:dev
```

### 프론트엔드
```bash
cd frontend
pnpm dev
```

### 포트 충돌 해결
```bash
# Windows
netstat -ano | findstr :3003
taskkill /PID <PID> /F

# WSL/Linux
lsof -ti:3003 | xargs -r kill -9
```

---

## 8. 주의사항

1. **포트 변경 금지**: 3000(프론트), 3003(백엔드) 고정
2. **커밋 전 빌드 확인**: `npm run build` 성공 확인
3. **환경변수 노출 금지**: .env 파일 내용 로그에 기록 금지
4. **이슈 해결 시 반드시 기록**: WORK_LOG.md에 해결 내용 압축 기록
