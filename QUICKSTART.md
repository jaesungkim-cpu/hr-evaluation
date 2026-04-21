# 빠른 시작 가이드

비버웍스 인사평가 시스템을 5분 안에 시작하기

## 필수 준비사항

- Node.js 18+ 설치 (nodejs.org)
- GitHub 계정
- Supabase 계정 (supabase.com)

## 1단계: Supabase 세팅 (2분)

### 1.1 프로젝트 생성
```
1. supabase.com 접속 → "New project"
2. 프로젝트명: "beaverworks-hr-eval"
3. 안전한 비밀번호 설정
4. Region: 서울 (ap-northeast-1)
5. "Create new project" 클릭 (2분 대기)
```

### 1.2 데이터베이스 스키마 실행
```
1. Supabase 대시보드 → "SQL Editor"
2. "New Query" 클릭
3. supabase/schema.sql 전체 복사 후 붙여넣기
4. "Run" 버튼 클릭
5. 완료 확인
```

### 1.3 API 키 복사
```
Settings → API
- NEXT_PUBLIC_SUPABASE_URL 복사
- NEXT_PUBLIC_SUPABASE_ANON_KEY 복사
- SUPABASE_SERVICE_ROLE_KEY 복사 (비밀로 유지)
```

## 2단계: 로컬 개발 환경 세팅 (2분)

### 2.1 프로젝트 복제
```bash
git clone https://github.com/YOUR_REPO.git
cd hr-eval-system
```

### 2.2 환경변수 설정
```bash
# .env.local 파일 생성
cp .env.local.example .env.local
```

`.env.local` 파일 편집:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 2.3 의존성 설치
```bash
npm install
```

## 3단계: 로컬 개발 서버 실행 (1분)

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

## 테스트 로그인

| 이메일 | 비밀번호 | 역할 |
|--------|----------|------|
| admin@beaverworks.com | password | 관리자 |
| ceo@beaverworks.com | password | CEO |
| team1@beaverworks.com | password | 1차 평가자 |
| vp1@beaverworks.com | password | 2차 평가자 |

## 주요 페이지 테스트

### 관리자로 로그인
- 이메일: `admin@beaverworks.com`
- 비밀번호: `password`
- 접근 가능 페이지:
  - `/admin` - 구성원 관리
  - `/admin/upload` - Excel 업로드

### 1차 평가자로 로그인
- 이메일: `team1@beaverworks.com`
- 비밀번호: `password`
- 접근 가능 페이지:
  - `/dashboard` - 평가할 구성원 목록
  - `/evaluate/[id]` - 평가 폼

### 2차 평가자로 로그인
- 이메일: `vp1@beaverworks.com`
- 비밀번호: `password`
- 접근 가능 페이지:
  - `/dashboard` - 평가할 구성원 목록
  - `/evaluate/[id]` - 등급 부여 페이지
  - `/grades` - 등급 분포 분석

## 빌드 및 배포

### 로컬 빌드 테스트
```bash
npm run build
npm run start
```

### Vercel 배포
```bash
# GitHub 저장소로 푸시
git push origin main

# Vercel에서 자동 배포 (또는 수동 배포)
# vercel.com 대시보드에서 배포 시작
```

## 개발 중 유용한 명령어

```bash
# 린트 검사
npm run lint

# 개발 서버 실행 (핫 리로드)
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start
```

## 파일 구조 빠른 이해

```
src/
├── app/              # 페이지 (page.tsx)
├── components/       # 재사용 가능한 UI 컴포넌트
├── lib/              # 유틸리티, 타입, 상수, DB 클라이언트
└── api/              # API 라우트 (route.ts)
```

## 자주 하는 작업

### 새 구성원 추가
1. Supabase 대시보드 → Table Editor
2. employees 테이블 → Insert row
3. 필수 정보 입력:
   - name: 이름
   - employee_number: 사원번호
   - email: 이메일 (로그인용)
   - department: 부서
   - title: 직급
   - role: 역할 (employee, first_evaluator, second_evaluator, ceo, admin)

### 평가 기간 생성
1. Supabase 대시보드 → Table Editor
2. evaluation_periods 테이블 → Insert row
3. 정보 입력:
   - name: "2026년 1차 인사평가"
   - year: 2026
   - status: 'first'

### 평가자 배정
1. Supabase 대시보드 → employees 테이블
2. 각 구성원을 선택하여 업데이트:
   - first_evaluator_id: 팀장 ID
   - second_evaluator_id: 본부장 ID

## 문제 해결 (체크리스트)

- [ ] Node.js 18+ 설치되어 있나?
- [ ] .env.local 파일이 있고 정확한 키가 입력되어 있나?
- [ ] npm install이 완료되었나?
- [ ] Supabase 데이터베이스 스키마가 실행되었나?
- [ ] 로그인 페이지에서 입력한 이메일/비밀번호가 정확한가?
- [ ] 브라우저 콘솔에 오류가 없나?

## 다음 단계

1. **기능 이해**: PROJECT_SUMMARY.md 읽기
2. **배포 준비**: DEPLOYMENT.md 읽기
3. **커스터마이징**: constants.ts와 types.ts에서 설정 수정
4. **프로덕션**: 환경변수 설정 후 Vercel로 배포

## 도움이 필요하신가요?

- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- Tailwind: https://tailwindcss.com/docs
- React: https://react.dev

## 성공 확인

아래 URL들에 접근 가능하면 성공입니다:

```
✓ http://localhost:3000           - 로그인 페이지
✓ http://localhost:3000/dashboard - 대시보드
✓ http://localhost:3000/grades    - 등급 분석
✓ http://localhost:3000/admin     - 관리 페이지
```

---

**환영합니다! 즐거운 개발을 하세요!**
