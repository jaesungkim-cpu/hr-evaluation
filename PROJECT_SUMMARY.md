# 프로젝트 요약

## 개요

비버웍스(BeaverWorks) 인사평가 시스템은 160명의 직원을 위한 완전한 성과 및 역량 평가 시스템입니다.

## 주요 기능

### 인증 및 접근 제어
- 이메일 + 비밀번호 기반 로그인
- 역할 기반 접근 제어 (RBAC)
- 자동 세션 관리

### 평가 프로세스
1. **자체 평가**: 구성원이 자신의 업적 기술
2. **1차 평가**: 팀장이 성과/역량 점수 부여 (참고용)
3. **2차 평가**: 본부장이 최종 등급(S/A/B/C/D) 부여
4. **CEO 승인**: 최종 검증 및 승인

### 평가 지표
- **성과평가 (70% 가중치)**
  - 납기(Delivery): 35%
  - 품질(Quality): 35%
  - 효율(Efficiency): 30%
- **역량평가 (30% 가중치)**
  - 리더십(Leadership): 35%
  - 성장지향성(Growth): 35%
  - 윤리의식(Ethics): 30%

### 데이터 분석
- 등급 분포 현황 (파이/바 차트)
- 부서별 등급 분포 분석
- 목표 등급 비율과의 비교 (경고 기능)
- Excel 내보내기

### 관리자 기능
- 구성원 관리 (CRUD)
- Excel 자체평가 데이터 일괄 업로드
- 평가 기간 관리
- 평가 현황 모니터링

## 기술 스택

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Lucide React Icons
- **Charts**: Recharts
- **Excel**: SheetJS (XLSX)

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Email/Password
- **API**: Next.js API Routes
- **Deployment**: Vercel

## 프로젝트 구조

```
hr-eval-system/
├── supabase/
│   └── schema.sql                 # 데이터베이스 스키마
├── src/
│   ├── app/
│   │   ├── layout.tsx             # 루트 레이아웃
│   │   ├── globals.css            # 전역 스타일
│   │   ├── page.tsx               # 로그인 페이지
│   │   ├── dashboard/
│   │   │   └── page.tsx           # 대시보드 (평가 대상 목록)
│   │   ├── evaluate/
│   │   │   └── [id]/
│   │   │       └── page.tsx       # 평가 폼
│   │   ├── grades/
│   │   │   └── page.tsx           # 등급 분포 분석
│   │   ├── admin/
│   │   │   ├── page.tsx           # 관리 대시보드
│   │   │   └── upload/
│   │   │       └── page.tsx       # Excel 업로드
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/
│   │       │   │   └── route.ts   # 로그인 API
│   │       │   └── logout/
│   │       │       └── route.ts   # 로그아웃 API
│   │       └── export/
│   │           └── route.ts       # 데이터 내보내기 API
│   ├── lib/
│   │   ├── types.ts               # TypeScript 타입 정의
│   │   ├── constants.ts           # 상수값 (점수 가중치, 등급 등)
│   │   ├── utils.ts               # 유틸리티 함수
│   │   ├── supabase.ts            # Supabase 클라이언트
│   │   └── supabase-server.ts     # Supabase 서버 클라이언트
│   └── components/
│       ├── Header.tsx             # 네비게이션 바
│       ├── LoginForm.tsx          # 로그인 폼
│       ├── EvaluateeList.tsx      # 평가 대상 목록
│       ├── EvaluationForm.tsx     # 1차 평가 폼
│       ├── GradeAssignment.tsx    # 2차 평가 (등급) 폼
│       ├── GradeDistributionChart.tsx  # 등급 분포 차트
│       └── ExcelUploader.tsx      # Excel 업로더
├── middleware.ts                  # Next.js 미들웨어 (인증)
├── package.json                   # 의존성
├── tsconfig.json                  # TypeScript 설정
├── tailwind.config.ts             # Tailwind 설정
├── next.config.js                 # Next.js 설정
├── .env.local.example             # 환경변수 템플릿
├── README.md                       # 프로젝트 설명
├── DEPLOYMENT.md                  # 배포 가이드
└── PROJECT_SUMMARY.md             # 이 파일
```

## 데이터베이스 스키마

### 주요 테이블

#### organizations
- 조직 구조 (회사, 본부, 실, 팀)
- 계층 구조: parent_id로 상위 조직 참조

#### employees
- 구성원 정보
- role: 'employee', 'first_evaluator', 'second_evaluator', 'ceo', 'admin'
- 1차/2차 평가자 할당
- is_evaluated: 평가 대상 여부

#### evaluation_periods
- 평가 기간 관리
- status: 'self', 'first', 'second', 'ceo', 'completed'
- 각 단계의 시작/종료 날짜

#### self_assessments
- 구성원의 자체평가 데이터
- JSON 형식으로 저장 (유연성)

#### evaluations
- 평가 기록
- eval_type: 'first', 'second', 'ceo'
- 점수, 등급, 의견 저장
- 감시 추적: created_at, updated_at

#### grade_ratios
- 등급별 목표 비율
- '팀원', '팀장급' 그룹별 설정
- S(10%), A(20%), B(50%), C(15%), D(5%)

## 점수 계산 로직

### 성과평가 환산점수
```
성과평가 환산점수 = (납기×35 + 품질×35 + 효율×30) ÷ 7
범위: 1-7점
```

### 역량평가 환산점수
```
역량평가 환산점수 = (리더십×35 + 성장지향성×35 + 윤리의식×30) ÷ 7
범위: 1-7점
```

### 종합점수
```
종합점수 = 성과평가×0.7 + 역량평가×0.3
범위: 1-7점
```

### 등급 할당
```
S: 6.5점 이상
A: 5.8-6.49점
B: 4.5-5.79점
C: 3.0-4.49점
D: 3.0점 미만
```

## 사용자 역할별 기능

### 구성원 (Employee)
- 자체평가 데이터 확인 (읽기 전용)
- 본인 평가 현황 확인

### 1차 평가자 (팀장/센터장/실장)
- 팀원의 자체평가 정보 확인
- 성과/역량 점수 부여 (7점 만점)
- 평가 의견 작성 (50자 이상)
- 평가 제출

### 2차 평가자 (본부장)
- 1차 평가 점수 확인
- 최종 등급(S/A/B/C/D) 부여
- 등급 부여 사유 기록
- 등급 분포 현황 모니터링

### CEO
- 모든 평가 검토
- 최종 승인/반려
- 전체 평가 현황 분석

### 관리자 (인사팀)
- 모든 기능 접근
- 구성원 관리
- 자체평가 데이터 업로드
- 평가 기간 관리
- 데이터 내보내기

## 보안 기능

### Row Level Security (RLS)
- Supabase RLS 정책으로 데이터 접근 제어
- 사용자는 자신과 관련된 데이터만 조회 가능

### 인증
- 세션 기반 쿠키 인증
- httpOnly 쿠키로 XSS 방지
- Secure 플래그 (HTTPS only)

### 데이터 검증
- 클라이언트 및 서버 측 검증
- 최소 문자 수 요구 (평가 의견 50자)
- 7점 리커트 척도 강제

## 성능 최적화

### Frontend
- Code splitting (동적 import)
- 이미지 최적화 (Next.js Image)
- CSS-in-JS로 번들 크기 최소화

### Backend
- 데이터베이스 인덱스 활용
- 쿼리 최적화
- 캐싱 전략

## 배포 및 인프라

### Vercel
- 자동 CI/CD 파이프라인
- 환경별 배포 (프리뷰, 프로덕션)
- 에러 추적 및 분석

### Supabase
- 관리형 PostgreSQL
- 자동 백업
- 확장성 높은 아키텍처

## 테스트 계정

| 이메일 | 비밀번호 | 역할 | 부서 |
|--------|----------|------|------|
| admin@beaverworks.com | password | 관리자 | 운영본부 |
| ceo@beaverworks.com | password | CEO | 경영진 |
| vp1@beaverworks.com | password | 2차평가자 | 영업1본부 |
| vp2@beaverworks.com | password | 2차평가자 | 영업2본부 |
| team1@beaverworks.com | password | 1차평가자 | 영업1본부 |
| emp1@beaverworks.com | password | 구성원 | 영업1본부 |

## 운영 가이드

### 평가 기간 생성
1. Supabase 대시보드 → Table Editor
2. evaluation_periods 테이블에서 새 행 추가
3. 각 단계의 시작/종료 날짜 설정

### 평가자 배정
1. employees 테이블에서 각 구성원 선택
2. first_evaluator_id, second_evaluator_id 설정
3. 저장

### 자체평가 데이터 업로드
1. Admin 계정으로 로그인
2. "관리" → "자체평가 업로드" 메뉴
3. Excel 파일 업로드
4. 자동으로 구성원과 매칭

### 평가 진행 현황 확인
1. 대시보드에서 평가 진행률 확인
2. 등급분포 페이지에서 분석
3. 미완료 평가 추적

## 문제 해결

### 자동으로 생성되지 않은 데이터
- Supabase 대시보드에서 schema.sql 실행 확인
- 모든 INSERT 문이 완료되었는지 확인

### 로그인 실패
- 환경변수 (.env.local) 설정 확인
- Supabase 프로젝트 URL과 키 정확성 확인
- 네트워크 연결 확인

### 평가 데이터 미저장
- 브라우저 콘솔에서 오류 메시지 확인
- Supabase 대시보드의 Logs 확인
- 네트워크 요청 상태 확인

## 향후 개선 사항 (선택사항)

1. **알림 기능**: 평가 마감일 자동 알림
2. **이메일 통합**: 평가 완료 알림 메일
3. **고급 분석**: 부서별 성과 트렌드 분석
4. **360도 평가**: 동료/부하직원 평가 추가
5. **모바일 앱**: React Native로 모바일 앱 개발
6. **API 문서**: 외부 시스템 연동을 위한 REST API
7. **감사 로그**: 모든 변경사항 추적
8. **다국어 지원**: 영어 등 추가 언어 지원

## 라이선스

내부 전용 시스템

## 연락처

기술 문의: IT팀 (it@beaverworks.com)
