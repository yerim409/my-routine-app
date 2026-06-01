# Supabase Sync + 완료 아카이브 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan.

**Goal:** localStorage 기반 루틴/할일 앱을 Supabase로 마이그레이션하고, Google 로그인으로 기기 간 동기화 + 완료 할일 아카이브 UI를 추가한다.

**Architecture:** Supabase Auth(Google OAuth)로 인증, supabase-js로 DB 직접 조작(service 레이어 없음). App.jsx에서 auth 상태 및 첫 로그인 마이그레이션을 관리. RoutineCalendar는 props로 allChecks를 받아 localStorage 의존 제거. 완료된 할일은 메인 목록에서 숨기고 TodoArchive 컴포넌트에서 달력+태그별로 분리 표시.

**Tech Stack:** React 19, Vite, supabase-js v2, Tailwind CSS v4, @dnd-kit

---

## Chunk 1: 인프라 — 패키지, 환경, Supabase 클라이언트, Auth

- [ ] **Task 1: supabase-js 설치**
```bash
cd ~/documents/projects/my-routine-app && npm install @supabase/supabase-js
```

- [ ] **Task 2: .gitignore에 .env 추가**
`/Users/yerim/documents/projects/my-routine-app/.gitignore`:
```
node_modules/
.env
.env.local
```

- [ ] **Task 3: .env 플레이스홀더 생성**
`/Users/yerim/documents/projects/my-routine-app/.env`:
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

- [ ] **Task 4: Supabase 스키마 SQL 파일 저장**
`/Users/yerim/documents/projects/my-routine-app/docs/superpowers/supabase-schema.sql`:
(Supabase 대시보드 SQL Editor에서 실행할 SQL)

- [ ] **Task 5: src/lib/supabase.js 생성**
- [ ] **Task 6: src/hooks/useAuth.js 생성**
- [ ] **Task 7: src/components/AuthScreen.jsx 생성**
- [ ] **Task 8: App.jsx 수정** (auth wrapper + migration + 로그아웃 버튼)
- [ ] **Task 9: 커밋** `feat: add supabase auth infrastructure`

## Chunk 2: RoutineTab Supabase 마이그레이션

- [ ] **Task 10: RoutineTab.jsx 전체 재작성** (DEFAULT_ROUTINES 제거, Supabase CRUD, 빈 상태 UI)
- [ ] **Task 11: RoutineCalendar.jsx 수정** (localStorage → props로 allChecks 수신)
- [ ] **Task 12: 커밋** `feat: migrate RoutineTab to Supabase`

## Chunk 3: TodoTab Supabase 마이그레이션

- [ ] **Task 13: TodoTab.jsx 수정** (Supabase CRUD, done_at 추가, 완료 숨김)
- [ ] **Task 14: 커밋** `feat: migrate TodoTab to Supabase`

## Chunk 4: TodoArchive 컴포넌트

- [ ] **Task 15: src/components/TodoArchive.jsx 생성** (달력 + 바텀시트 + 태그별 섹션)
- [ ] **Task 16: TodoTab에 TodoArchive 통합**
- [ ] **Task 17: 커밋** `feat: add todo archive with calendar and tag sections`
