# HR Performance Evaluation System

비버웍스(BeaverWorks) 인사평가 웹 시스템

## 개요

Next.js 14 + Supabase를 기반으로 한 인사평가 관리 시스템입니다.

## 시스템 요구사항

- Node.js 18+
- npm 또는 yarn
- Supabase 프로젝트

## 설치 및 실행

### 1. 환경 설정

```bash
cp .env.local.example .env.local
```

.env.local 파일에서 다음 정보를 입력하세요:
- NEXT_PUBLIC_SUPABASE_URL: Supabase 프로젝트 URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY: Supabase 익명 키
- SUPABASE_SERVICE_ROLE_KEY: Supabase 서비스 역할 키

### 2. 데이터베이스 초기화

Supabase 대시보드의 SQL Editor에서 `supabase/schema.sql`의 내용을 실행하세요.

### 3. 패키지 설치

```bash
npm install
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000으로 접속하세요.

## 프로젝트 구조

```
src/
├── app/              # Next.js App Router pages
├── lib/              # 유틸리티, 상수, Supabase 설정
├── components/       # React 컴포넌트
└── api/              # API 라우트
```

## 주요 기능

### 인증
- 이메일 + 비밀번호 기반 로그인

### 역할 (Role)
- 관리자 (인사팀)
- CEO
- 2차 평가자 (본부장)
- 1차 평가자 (팀장)

### 평가 프로세스
1. **자체 평가** (Self-assessment): 구성원이 자신의 업적을 기술
2. **1차 평가** (First evaluation): 팀장이 점수 부여 (참고용)
3. **2차 평가** (Second evaluation): 본부장이 최종 등급 부여
4. **CEO 승인** (CEO approval): CEO가 모든 등급 최종 승인

## 배포

### Vercel 배포

1. GitHub에 저장소 푸시
2. Vercel에서 저장소 연결
3. 환경 변수 설정
4. 배포

## 라이선스

내부 전용
