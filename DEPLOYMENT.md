# 배포 및 설정 가이드

비버웍스 인사평가 시스템 Vercel 배포 및 Supabase 설정 가이드입니다.

## 사전 준비

- GitHub 계정
- Vercel 계정 (github.com/signup을 통해 GitHub로 가입 권장)
- Supabase 계정 (supabase.com)

## 1단계: Supabase 프로젝트 생성

### 1.1 Supabase 프로젝트 생성

1. supabase.com에서 가입 또는 로그인
2. "New project" 클릭
3. 프로젝트 이름: `beaverworks-hr-eval`
4. Database password: 안전한 비밀번호 설정
5. Region: 서울 (ap-northeast-1) 선택
6. "Create new project" 클릭 (생성 완료 대기, 약 2분)

### 1.2 데이터베이스 초기화

1. Supabase 대시보드의 "SQL Editor" 탭 열기
2. "New Query" 클릭
3. `supabase/schema.sql`의 전체 내용 복사 후 붙여넣기
4. "Run" 버튼 클릭
5. 완료 메시지 확인

### 1.3 API 키 확인

1. Supabase 대시보드에서 "Settings" → "API" 탭
2. 다음 정보 복사:
   - Project URL: `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key: `SUPABASE_SERVICE_ROLE_KEY` (비밀로 유지)

## 2단계: GitHub 저장소 생성 및 코드 업로드

### 2.1 GitHub 저장소 생성

1. github.com에 로그인
2. "New repository" 클릭
3. 저장소 이름: `beaverworks-hr-eval-system`
4. "Create repository" 클릭

### 2.2 코드 업로드

```bash
# hr-eval-system 디렉토리로 이동
cd /path/to/hr-eval-system

# Git 초기화
git init

# 원격 저장소 추가 (YOUR_USERNAME은 본인의 GitHub 계정)
git remote add origin https://github.com/YOUR_USERNAME/beaverworks-hr-eval-system.git

# 모든 파일 추가 및 커밋
git add .
git commit -m "Initial commit: HR Performance Evaluation System"

# main 브랜치로 푸시
git branch -M main
git push -u origin main
```

## 3단계: Vercel 배포

### 3.1 Vercel 연결

1. vercel.com 방문
2. GitHub 계정으로 로그인
3. "Import Project" 클릭
4. GitHub 저장소 선택: `beaverworks-hr-eval-system`

### 3.2 환경 변수 설정

1. "Environment Variables" 섹션에서 다음 추가:

```
NEXT_PUBLIC_SUPABASE_URL = <Supabase Project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY = <Supabase anon key>
SUPABASE_SERVICE_ROLE_KEY = <Supabase service role key>
```

### 3.3 배포

1. "Deploy" 버튼 클릭
2. 배포 완료 대기 (약 3-5분)
3. 배포 완료 후 "Visit" 클릭하여 앱 확인

## 4단계: 테스트 계정 설정

### 4.1 초기 테스트 계정

데이터베이스에 자동으로 생성된 테스트 계정:

```
이메일: admin@beaverworks.com
비밀번호: password
역할: 관리자
```

### 4.2 다른 계정으로 테스트

Supabase 대시보드의 "Table Editor"에서 `employees` 테이블을 보면 다른 테스트 계정들을 확인할 수 있습니다:

- `vp1@beaverworks.com` - 2차 평가자 (본부장)
- `team1@beaverworks.com` - 1차 평가자 (팀장)

모든 테스트 계정의 기본 비밀번호: `password`

## 5단계: 배포 후 체크리스트

- [ ] 로그인 페이지 접근 확인
- [ ] 테스트 계정으로 로그인 성공
- [ ] 대시보드 페이지 로드 확인
- [ ] 평가 대상 목록 표시 확인
- [ ] 평가 폼 점수 선택 가능 확인
- [ ] 등급 분포 차트 표시 확인
- [ ] Admin 페이지 접근 (admin@beaverworks.com로 로그인)

## 6단계: 운영 관리

### 6.1 구성원 추가/수정

1. Admin 계정으로 로그인
2. "관리" → "구성원 목록" 메뉴
3. "새 구성원 추가" 또는 각 구성원의 "편집" 버튼

### 6.2 자체평가 데이터 업로드

1. Admin 계정으로 로그인
2. "관리" → "자체평가 업로드" 메뉴
3. Excel 파일 선택 및 업로드
   - 파일 형식: .xlsx
   - 필수 컬럼: name (이름), email (이메일) 또는 employee_number (사원번호)

### 6.3 평가 기간 생성 및 관리

1. Supabase 대시보드의 Table Editor에서 `evaluation_periods` 테이블 선택
2. "Insert" 클릭하여 새로운 평가 기간 추가
   - name: "2026년 1차 인사평가" (예)
   - year: 2026
   - status: 'first' (시작 단계)

### 6.4 평가자 배정

1. `employees` 테이블에서 각 구성원의:
   - `first_evaluator_id`: 1차 평가자 ID (팀장)
   - `second_evaluator_id`: 2차 평가자 ID (본부장)
2. 저장

## 문제 해결

### 데이터베이스 연결 오류

- .env.local 파일의 Supabase URL과 키 확인
- Supabase 대시보드에서 "Settings" → "Database" → RLS 정책 확인

### 로그인 실패

- 이메일과 비밀번호 정확성 확인
- Supabase 대시보드의 `employees` 테이블에서 계정 존재 확인

### 평가 데이터 업로드 오류

- Excel 파일이 .xlsx 형식인지 확인
- 이름, 이메일, 또는 사원번호 컬럼이 정확한지 확인
- 데이터베이스의 구성원과 일치하는지 확인

## 보안 사항

### 운영 체크리스트

1. [ ] Supabase service_role_key를 GitHub에 커밋하지 않기
2. [ ] .env.local.example만 저장소에 포함하기
3. [ ] 정기적인 백업 실행 (Supabase 대시보드 → Backups)
4. [ ] Row Level Security (RLS) 정책 검토
5. [ ] 사용자 접근 권한 정기 검토

## 추가 설정 (선택사항)

### 커스텀 도메인 연결

1. Vercel 대시보드에서 프로젝트 선택
2. "Settings" → "Domains"
3. 도메인 추가 및 DNS 설정

### SSL/TLS 인증서

- Vercel에서 자동으로 제공 (Let's Encrypt)

### 이메일 알림 설정

- Supabase 대시보드의 "Database" → "Extensions"에서 pgvector 또는 pg_cron 활성화 가능
- 별도의 이메일 서비스 (SendGrid 등) 통합 가능

## 스케일링 고려사항

- Vercel 무료 플랜: 월 100GB 대역폭, 충분한 사용자 수 지원
- Supabase 무료 플랜: 500MB 스토리지, 일일 50,000 API 호출
- 사용자 수가 증가하면 유료 플랜으로 업그레이드 검토

## 지원 및 문서

- Next.js 문서: https://nextjs.org/docs
- Supabase 문서: https://supabase.com/docs
- Vercel 문서: https://vercel.com/docs
