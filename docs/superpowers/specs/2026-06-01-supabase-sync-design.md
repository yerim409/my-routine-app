# Supabase Sync + 루틴 개인화 설계

## 목표

1. 하드코딩된 DEFAULT_ROUTINES 제거 → 빈 초기 상태
2. Google 로그인(Supabase Auth) 추가
3. 모든 데이터를 localStorage → Supabase DB로 이전
4. 첫 로그인 시 기존 localStorage 데이터 자동 마이그레이션
5. 완료된 할 일 아카이브 UI (달력 + 태그별 섹션)

---

## 아키텍처

- **Backend**: Supabase (Auth + PostgreSQL + Row Level Security)
- **Auth**: Google OAuth (Supabase Auth Provider)
- **Client**: supabase-js v2
- **실시간 동기화**: 불필요 (탭 간 실시간 X, 기기 전환 시 로그인만 하면 sync됨)

로그인 → 데이터 fetch → 앱 사용 → 변경시마다 Supabase upsert

---

## ID 생성 전략

클라이언트에서 `Date.now()`로 생성한 BIGINT를 ID로 사용 (기존 localStorage 패턴 유지).
DB는 `BIGINT PRIMARY KEY` (auto-increment 없음). 신규 루틴/투두 추가 시 `Date.now()` 사용.
마이그레이션 재시도 시 모든 테이블(routines, todos, todo_tags 포함) upsert 사용.
단일 사용자·단일 탭 앱이므로 밀리초 충돌 가능성은 실용적으로 무시.

---

## DB 스키마

### routines
```sql
CREATE TABLE routines (
  id         BIGINT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  emoji      TEXT NOT NULL DEFAULT '✨',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own routines" ON routines
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### routine_checks
checked=true인 row만 저장. unchecked 처리는 row DELETE.
```sql
CREATE TABLE routine_checks (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id BIGINT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,  -- 'YYYY-MM-DD'
  PRIMARY KEY (user_id, routine_id, date)
);
ALTER TABLE routine_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own checks" ON routine_checks
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### todos
```sql
CREATE TABLE todos (
  id         BIGINT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  emoji      TEXT NOT NULL DEFAULT '📌',
  done       BOOLEAN NOT NULL DEFAULT false,
  done_at    TEXT,  -- 'YYYY-MM-DD', 완료 처리한 날짜 (아카이브 달력 기준)
  "when"     TEXT,  -- 'YYYY-MM-DD'
  deadline   TEXT,  -- 'YYYY-MM-DD'
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own todos" ON todos
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### todo_tags
```sql
CREATE TABLE todo_tags (
  id          BIGINT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color_index INT NOT NULL DEFAULT 0
);
ALTER TABLE todo_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own tags" ON todo_tags
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### todo_tag_links
```sql
CREATE TABLE todo_tag_links (
  todo_id  BIGINT NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  tag_id   BIGINT NOT NULL REFERENCES todo_tags(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (todo_id, tag_id)
);
ALTER TABLE todo_tag_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own tag links" ON todo_tag_links
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

---

## 컴포넌트 변경 범위

### 신규
- `src/lib/supabase.js` — Supabase 클라이언트 초기화
- `src/hooks/useAuth.js` — 반환: `{ user, loading, signInWithGoogle, signOut }`
  - `user`: Supabase User 객체 or null
  - `loading`: 인증 상태 확인 중 boolean
  - `signInWithGoogle()`: Google OAuth 팝업 실행
  - `signOut()`: 로그아웃
- `src/components/AuthScreen.jsx` — Google 로그인 화면 (로그인 버튼 1개)

### 수정
- `src/App.jsx`
  - `useAuth` 훅 사용
  - `loading` 중: 전체화면 스피너
  - `user` 없음: `<AuthScreen>` 렌더
  - `user` 있음: 기존 앱 렌더
- `src/components/RoutineTab.jsx`
  - DEFAULT_ROUTINES 제거
  - 빈 상태 UI 추가 ("첫 루틴을 추가해보세요")
  - localStorage → supabase-js 직접 호출 (service 레이어 없음)
  - 마이그레이션 로직 포함
  - CRUD 실패 시: 콘솔 에러만 (사용자 토스트 없음)
- `src/components/TodoTab.jsx`
  - localStorage → supabase-js 직접 호출
  - 마이그레이션 로직 포함
  - CRUD 실패 시: 콘솔 에러만
  - 완료 할 일 메인 목록에서 제거 (done=true는 아래 아카이브에서만 표시)
- `src/components/TodoArchive.jsx` (신규)
  - **달력 섹션**: 월간 달력, 완료 할 일 있는 날짜에 초록 점 표시
    - 날짜 클릭 → 해당 날짜에 완료된 할 일 목록을 바텀시트로 표시
    - 완료 기준 날짜: `done=true`가 된 시점 날짜 (→ todos 테이블에 `done_at TEXT` 컬럼 추가)
  - **태그별 섹션**: 완료 할 일 전체를 태그별로 그룹핑, 태그마다 접기/펼치기
    - 태그 없는 완료 할 일은 "태그 없음" 섹션으로 묶음
    - 기본 상태: 모두 접힘

---

## 마이그레이션 전략

**실행 위치**: `App.jsx`에서 로그인 직후 1회 실행 (RoutineTab/TodoTab 분산 X, race condition 방지).

**조건 및 순서**:
1. `localStorage.getItem('migrated_to_supabase') === 'true'`이면 → skip
2. Supabase에 routines, todos 각 테이블을 독립적으로 INSERT (테이블별 체크 없음, 멱등성은 플래그로만 관리)
3. routines INSERT → routine_checks INSERT → todos INSERT → todo_tags INSERT → todo_tag_links INSERT 순서로 FK 의존성 순서 준수
4. 전체 성공 시만 `localStorage.setItem('migrated_to_supabase', 'true')` 저장
5. 중간 실패 시 → 플래그 미저장, 콘솔 에러 로깅, 다음 로그인 시 재시도
6. 재시도 시 routines PRIMARY KEY 충돌 → Supabase `upsert` 사용으로 처리 (INSERT OR UPDATE)
7. 이후 localStorage는 읽지 않음

---

## 환경변수

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

`.env` 파일에 저장, `.gitignore`에 `.env` 추가 필수. Vercel 배포 시 환경변수 별도 설정 필요.

---

## 빈 상태 UI

루틴 없을 때:
```
🌱
아직 루틴이 없어요
+ 루틴 추가 버튼
```

할 일 없을 때 (기존 UI 유지):
```
✅
할 일을 추가해봐요!
```

---

## 완료 할 일 아카이브 UI (TodoArchive)

**레이아웃 (TodoTab 하단에 배치)**:
```
[ 진행 중 할 일 목록 ]
[ + 할 일 추가 버튼 ]

─── 완료된 할 일 ───

[ 월간 달력 ]
 • 완료 있는 날 → 초록 점
 • 날짜 탭 → 바텀시트: 그날 완료된 할 일 목록

[ 태그별 섹션 ]
 ▶ 국시 (3)       ← 접힘 기본
 ▶ 일본어 (1)
 ▶ 태그 없음 (2)
```

**바텀시트**: 날짜 탭 시 슬라이드업. 해당 날짜 `done_at` 기준 완료 목록 표시. 닫기 버튼 or 바깥 탭으로 닫힘.

**태그 섹션**: 태그마다 헤더(태그명 + 완료 개수) 탭하면 목록 토글. 기본 모두 접힘.
