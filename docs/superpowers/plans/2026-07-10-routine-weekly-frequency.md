# 루틴 주 N회 반복 규칙 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 루틴에 "주 N회 (유연)" 반복 규칙을 추가한다 — 주간 진행도 배지, 주 단위 스트릭, 달성률 반영 포함.

**Architecture:** `routines` 테이블에 `weekly_target SMALLINT` 컬럼 하나 추가 (NULL = 매일). 날짜/주 계산과 주간 스트릭은 순수 함수로 `src/lib/dates.js`에 분리하고, `RoutineTab.jsx`가 이를 사용해 UI를 분기한다. `routine_checks`는 변경 없음.

**Tech Stack:** React 19 + Vite + Tailwind 4 + Supabase (JS client v2). 테스트 러너 없음 — 스펙에 따라 순수 함수는 node 원라이너로, UI는 dev 서버에서 수동 검증 (TDD 러너 도입은 스펙에서 제외됨).

**Spec:** `docs/superpowers/specs/2026-07-10-routine-weekly-frequency-design.md`

**⚠️ 작업 규칙:**
- `src/components/TodoTab.jsx`, `src/components/TodoArchive.jsx`에는 사용자의 커밋 안 된 작업이 있다. **절대 수정하거나 stage하지 말 것.**
- 커밋할 때는 반드시 파일을 명시해서 `git add <파일>` — `git add -A` 금지.
- `docs/superpowers/supabase-schema.sql`에도 미커밋 변경(todos.order_index)이 있다. 이 파일은 **수정만 하고 커밋하지 않는다** (투두 작업 커밋 때 같이 들어감). 최종 보고에 이 사실을 명시할 것.

---

## Chunk 1: 전체 구현

### Task 1: DB 스키마 — weekly_target 컬럼

**Files:**
- Modify: `docs/superpowers/supabase-schema.sql` (커밋하지 않음 — 위 작업 규칙 참고)
- Manual: Supabase SQL Editor (사용자 확인 필요)

- [x] **Step 1: 스키마 문서에 컬럼 추가**

`CREATE TABLE routines`의 `sort_order` 줄 아래에 추가:

```sql
  weekly_target SMALLINT,  -- NULL = 매일, 1~6 = 주 N회
```

파일 맨 끝에 마이그레이션 섹션 추가:

```sql

-- 2026-07-10: 주 N회 반복 규칙. 이미 생성된 DB에는 아래만 실행
ALTER TABLE routines ADD COLUMN weekly_target SMALLINT;
```

- [x] **Step 2: 사용자에게 마이그레이션 실행 요청 (BLOCKING)**

사용자에게 Supabase 대시보드 → SQL Editor에서 다음을 실행해달라고 요청하고, 완료 확인을 받을 때까지 다음 태스크로 진행하지 않는다:

```sql
ALTER TABLE routines ADD COLUMN weekly_target SMALLINT;
```

확인 방법: Table Editor에서 `routines` 테이블에 `weekly_target` 컬럼이 보이면 됨.

### Task 2: 날짜/주 계산 순수 함수 모듈

**Files:**
- Create: `src/lib/dates.js`

- [x] **Step 1: `src/lib/dates.js` 작성**

```js
// dateKey('YYYY-MM-DD') 기반 날짜 계산 헬퍼.
// 반드시 로컬 타임존 기준으로 계산한다 — new Date('YYYY-MM-DD')는 UTC 자정으로
// 파싱되어 타임존 버그를 일으키므로 금지.

export function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function getTodayKey() {
  return getDateKey(new Date())
}

export function parseDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function getPrevDateKey(dateKey) {
  const date = parseDateKey(dateKey)
  date.setDate(date.getDate() - 1)
  return getDateKey(date)
}

// 해당 날짜가 속한 주(월요일 시작)의 월요일 dateKey
export function getWeekKey(dateKey) {
  const date = parseDateKey(dateKey)
  const daysSinceMonday = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - daysSinceMonday)
  return getDateKey(date)
}

export function getPrevWeekKey(weekKey) {
  const date = parseDateKey(weekKey)
  date.setDate(date.getDate() - 7)
  return getDateKey(date)
}

// weekKey 주의 월~일 dateKey 7개
export function getWeekDateKeys(weekKey) {
  const start = parseDateKey(weekKey)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return getDateKey(d)
  })
}

// allChecks 형태: { [dateKey]: { [routineId]: true } }
export function countWeekChecks(routineId, allChecks, weekKey) {
  return getWeekDateKeys(weekKey).filter(ds => allChecks[ds]?.[routineId]).length
}

// 주 N회 루틴의 연속 달성 주 수.
// 이번 주는 아직 진행 중이므로 목표 미달이어도 스트릭을 깨지 않는다 (i === 0 skip).
export function calculateWeeklyStreak(routineId, weeklyTarget, allChecks, dateKey) {
  let weekKey = getWeekKey(dateKey)
  let streak = 0
  let lastAchievedWeek = null

  for (let i = 0; i < 52; i++) {
    if (countWeekChecks(routineId, allChecks, weekKey) >= weeklyTarget) {
      if (!lastAchievedWeek) lastAchievedWeek = weekKey
      streak++
    } else if (i > 0) {
      break
    }
    weekKey = getPrevWeekKey(weekKey)
  }

  return { streak, lastAchievedWeek }
}
```

- [x] **Step 2: node로 순수 함수 검증**

프로젝트 루트에서 실행:

```bash
node --input-type=module -e "
const m = await import(process.cwd() + '/src/lib/dates.js')
console.log(m.getWeekKey('2026-07-10'))      // 2026-07-06 (금요일 → 그 주 월요일)
console.log(m.getWeekKey('2026-07-06'))      // 2026-07-06 (월요일 자기 자신)
console.log(m.getWeekKey('2026-07-12'))      // 2026-07-06 (일요일도 같은 주)
console.log(m.getPrevWeekKey('2026-07-06'))  // 2026-06-29
const checks = {
  '2026-06-29': { 1: true }, '2026-07-01': { 1: true }, '2026-07-03': { 1: true },
  '2026-07-06': { 1: true }, '2026-07-08': { 1: true },
}
console.log(m.countWeekChecks(1, checks, '2026-07-06'))          // 2
console.log(JSON.stringify(m.calculateWeeklyStreak(1, 3, checks, '2026-07-10')))
// {\"streak\":1,\"lastAchievedWeek\":\"2026-06-29\"} — 이번 주 2/3 진행 중이라 안 깨지고, 지난주 달성
console.log(JSON.stringify(m.calculateWeeklyStreak(1, 2, checks, '2026-07-10')))
// {\"streak\":2,\"lastAchievedWeek\":\"2026-07-06\"} — 이번 주 이미 2/2 달성
"
```

Expected: 주석에 적힌 값과 정확히 일치. 하나라도 다르면 구현을 고치고 재실행.

- [x] **Step 3: Commit**

```bash
git add src/lib/dates.js
git commit -m "feat: add date/week helpers for weekly routines"
```

### Task 3: RoutineTab이 공용 날짜 헬퍼 사용 (동작 불변 리팩터링)

**Files:**
- Modify: `src/components/RoutineTab.jsx:20-33` (로컬 날짜 헬퍼 제거)

- [x] **Step 1: 로컬 헬퍼를 import로 교체**

`RoutineTab.jsx` 상단의 로컬 함수 `getDateKey`, `getTodayKey`, `getPrevDateKey` 정의(20~33행)를 삭제하고 import 추가:

```js
import { getDateKey, getTodayKey, getPrevDateKey } from '../lib/dates'
```

`calculateStreak`(일일 스트릭)은 RoutineTab에 그대로 둔다 — 스펙상 변경 없음. `RoutineCalendar.jsx`도 건드리지 않는다.

- [x] **Step 2: dev 서버에서 회귀 확인**

`npm run dev` 실행 후 루틴 탭 로드 확인: 루틴 목록, 체크 토글, 🔥 스트릭 숫자, 달성률이 기존과 동일하게 동작. 콘솔 에러 없음.

- [x] **Step 3: Commit**

```bash
git add src/components/RoutineTab.jsx
git commit -m "refactor: use shared date helpers in RoutineTab"
```

### Task 4: 주간 진행도 배지 + 주 단위 스트릭 표시

**Files:**
- Modify: `src/components/RoutineTab.jsx` — `SortableRoutineItem` 내부

- [x] **Step 1: import에 주간 헬퍼 추가**

```js
import { getDateKey, getTodayKey, getPrevDateKey, getWeekKey, getPrevWeekKey, countWeekChecks, calculateWeeklyStreak } from '../lib/dates'
```

- [x] **Step 2: SortableRoutineItem의 스트릭 계산 분기**

기존 코드 (84~86행):

```js
const { streak, lastCheckedDate } = calculateStreak(routine.id, allChecks, dateKey)
const prevDateKey = getPrevDateKey(dateKey)
const isStreakActive = streak > 0 && (lastCheckedDate === dateKey || lastCheckedDate === prevDateKey)
```

다음으로 교체:

```js
const isWeekly = !!routine.weekly_target
const weekKey = getWeekKey(dateKey)
const weekCount = isWeekly ? countWeekChecks(routine.id, allChecks, weekKey) : 0

let streak, isStreakActive
if (isWeekly) {
  const { streak: s, lastAchievedWeek } = calculateWeeklyStreak(routine.id, routine.weekly_target, allChecks, dateKey)
  streak = s
  isStreakActive = streak > 0 && (lastAchievedWeek === weekKey || lastAchievedWeek === getPrevWeekKey(weekKey))
} else {
  const { streak: s, lastCheckedDate } = calculateStreak(routine.id, allChecks, dateKey)
  streak = s
  const prevDateKey = getPrevDateKey(dateKey)
  isStreakActive = streak > 0 && (lastCheckedDate === dateKey || lastCheckedDate === prevDateKey)
}
```

- [x] **Step 3: 이름 아래 주간 진행도 배지**

비편집 표시 분기의 이름 `<p>` 바로 아래( `{editMode && ...}` 줄 위)에 추가:

```jsx
{isWeekly && !editMode && (
  <p className={`text-xs mt-0.5 font-semibold ${weekCount >= routine.weekly_target ? 'text-emerald-500' : 'text-gray-400'}`}>
    이번 주 {weekCount}/{routine.weekly_target}
  </p>
)}
```

- [x] **Step 4: 스트릭 숫자에 주 단위 표기**

스트릭 표시 `<span>`의 `{streak}`를 다음으로 교체:

```jsx
{streak}{isWeekly ? '주' : ''}
```

- [x] **Step 5: dev 서버에서 확인**

아직 UI로 주 N회 루틴을 만들 수 없으므로, 기존 매일 루틴이 그대로 동작하는지(배지 없음, 스트릭 숫자 동일) 확인. 콘솔 에러 없음.

- [x] **Step 6: Commit**

```bash
git add src/components/RoutineTab.jsx
git commit -m "feat: weekly progress badge and week-based streak for weekly routines"
```

### Task 5: 오늘 달성률 분모 수정

**Files:**
- Modify: `src/components/RoutineTab.jsx` — `RoutineTab` 본문의 달성률 계산 (277~279행 부근)

- [x] **Step 1: 분모 계산 교체**

기존:

```js
const doneCount = routines.filter(r => checks[r.id]).length
const total = routines.length
const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100)
```

교체:

```js
// 주 N회 루틴은 체크한 날만 분자·분모에 포함 — 체크하면 달성률이 오르고, 안 하면 영향 없음
const doneCount = routines.filter(r => checks[r.id]).length
const dailyTotal = routines.filter(r => !r.weekly_target).length
const weeklyCheckedToday = routines.filter(r => r.weekly_target && checks[r.id]).length
const total = dailyTotal + weeklyCheckedToday
const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100)
```

- [x] **Step 2: dev 서버에서 회귀 확인**

매일 루틴만 있는 현재 상태에서 달성률이 기존과 동일한지 확인 (weekly가 없으면 `total === routines.length`).

- [x] **Step 3: Commit**

```bash
git add src/components/RoutineTab.jsx
git commit -m "feat: exclude unchecked weekly routines from daily completion rate"
```

### Task 6: 추가 폼에 빈도 선택

**Files:**
- Modify: `src/components/RoutineTab.jsx` — 모듈 상단 상수, `newRoutine` state, `addRoutine`, 추가 폼 JSX

- [x] **Step 1: 빈도 옵션 상수 추가**

모듈 최상단(`getDateKey` import 아래)에:

```js
const FREQ_OPTIONS = [
  { label: '매일', value: null },
  ...[1, 2, 3, 4, 5, 6].map(n => ({ label: `주 ${n}회`, value: n })),
]
```

- [x] **Step 2: state와 insert에 weekly_target 반영**

`newRoutine` 초기값 두 곳(선언부와 `addRoutine` 내 리셋)을 모두:

```js
{ name: '', emoji: '✨', weekly_target: null }
```

`addRoutine`의 routine 객체에 `weekly_target: newRoutine.weekly_target` 추가:

```js
const routine = { id, user_id: userId, name: newRoutine.name.trim(), emoji: newRoutine.emoji, sort_order: routines.length, weekly_target: newRoutine.weekly_target }
```

- [x] **Step 3: 추가 폼에 빈도 칩 UI**

추가 폼에서 입력 row(`<div className="flex gap-2 mb-3">...`)와 버튼 row 사이에 삽입:

```jsx
<div className="flex gap-1.5 mb-3 flex-wrap">
  {FREQ_OPTIONS.map(opt => (
    <button
      key={opt.label}
      onClick={() => setNewRoutine({ ...newRoutine, weekly_target: opt.value })}
      className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${newRoutine.weekly_target === opt.value ? 'bg-emerald-400 text-white' : 'bg-gray-50 text-gray-400'}`}
    >
      {opt.label}
    </button>
  ))}
</div>
```

- [x] **Step 4: dev 서버에서 확인**

주 3회 루틴을 하나 추가 → 리스트에 `이번 주 0/3` 배지 표시, 🔥 `0주`. 체크하면 `1/3`로 갱신되고 달성률 분모에 포함. 새로고침 후에도 유지(Supabase 저장 확인).

- [x] **Step 5: Commit**

```bash
git add src/components/RoutineTab.jsx
git commit -m "feat: frequency picker in add-routine form"
```

### Task 7: 편집 모드에서 빈도 수정

**Files:**
- Modify: `src/components/RoutineTab.jsx` — `SortableRoutineItem`의 편집 분기

- [x] **Step 1: 편집 state 추가**

`SortableRoutineItem` 내 `editEmoji` state 아래에:

```js
const [editTarget, setEditTarget] = useState(routine.weekly_target ?? null)
```

`saveEdit`의 onUpdate 호출에 포함:

```js
onUpdate(routine.id, { name: editName.trim(), emoji: editEmoji, weekly_target: editTarget })
```

- [x] **Step 2: 편집 분기 JSX에 빈도 칩 추가**

기존 편집 분기(fragment로 이모지 input + 이름 input)를 다음 구조로 교체:

```jsx
<div className="flex-1">
  <div className="flex gap-2">
    <input
      type="text"
      value={editEmoji}
      onChange={e => setEditEmoji(e.target.value)}
      className="w-10 text-center text-lg bg-gray-50 rounded-lg p-1 focus:outline-none"
    />
    <input
      ref={inputRef}
      type="text"
      value={editName}
      onChange={e => setEditName(e.target.value)}
      onBlur={saveEdit}
      onKeyDown={e => e.key === 'Enter' && saveEdit()}
      className="flex-1 text-sm font-medium bg-gray-50 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-300"
    />
  </div>
  <div className="flex gap-1.5 mt-2 flex-wrap">
    {FREQ_OPTIONS.map(opt => (
      <button
        key={opt.label}
        onPointerDown={e => e.preventDefault()}
        onClick={() => setEditTarget(opt.value)}
        className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${editTarget === opt.value ? 'bg-emerald-400 text-white' : 'bg-gray-50 text-gray-400'}`}
      >
        {opt.label}
      </button>
    ))}
  </div>
</div>
```

`onPointerDown={e => e.preventDefault()}`가 필수다 — 없으면 칩을 누르는 순간 이름 input의 blur → `saveEdit` → 편집 종료가 먼저 일어나서 클릭이 씹힌다.

- [x] **Step 3: dev 서버에서 확인**

편집 모드 → 루틴 탭 → 인라인 편집에서 빈도 칩 표시 확인. 매일 루틴을 주 2회로 바꾸면 배지가 나타나고, 반대로 바꾸면 사라짐. 새로고침 후 유지 확인.

- [x] **Step 4: Commit**

```bash
git add src/components/RoutineTab.jsx
git commit -m "feat: edit routine frequency in edit mode"
```

### Task 8: 최종 수동 검증 (스펙 체크리스트)

**Files:** 없음 (검증만)

- [x] **Step 1: 스펙의 검증 시나리오 전체 수행**

dev 서버에서:

1. 매일 루틴 기존 동작(체크/스트릭/달성률) 회귀 확인
2. 주 3회 루틴 생성 → `이번 주 0/3` 배지 확인
3. 3일 체크(오늘 + 캘린더에서 과거 날짜 선택해 체크) → 배지 emerald 강조 + 스트릭 반영 확인
4. 달성률: 주 N회 루틴 체크 전후로 분모 변화 확인 (체크 → 분자·분모 +1)
5. 과거 날짜(지난주)를 선택했을 때 배지가 **그 주** 기준으로 계산되는지 확인
6. 편집 모드에서 주 N회 루틴을 드래그 정렬 → 새로고침 → 배지 유지 확인
   (`handleDragEnd`의 upsert payload에 `weekly_target`이 없어도 보존되는지 실증)
7. `npm run lint` 통과

- [x] **Step 2: 결과 보고**

사용자에게 보고: 완료된 커밋 목록, 검증 결과, 그리고 `docs/superpowers/supabase-schema.sql` 변경분이 의도적으로 미커밋 상태로 남아있다는 점(기존 todos.order_index 미커밋 변경과 함께 나중에 커밋).
