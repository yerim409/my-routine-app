// VITE_MOCK=1 전용 인메모리 Supabase 목.
// 로그인 없이 UI를 띄워보기 위한 개발 도구 — 프로덕션 빌드에는 포함되지 않는다.
import { getTodayKey, getPrevDateKey, getNextDateKey, getWeekKey, getPrevWeekKey, getWeekDateKeys } from './dates'

const MOCK_USER = { id: 'mock-user', email: 'mock@dev.local' }

// 테이블별 고유 키 (upsert 매칭용)
const PRIMARY_KEYS = {
  routines: ['id'],
  todos: ['id'],
  todo_tags: ['id'],
  routine_checks: ['user_id', 'routine_id', 'date'],
  todo_tag_links: ['todo_id', 'tag_id'],
}

function seedData() {
  const uid = MOCK_USER.id
  const today = getTodayKey()
  const d1 = getPrevDateKey(today)
  const d2 = getPrevDateKey(d1)
  const d3 = getPrevDateKey(d2)
  const weekKey = getWeekKey(today)
  const prevWeek = getWeekDateKeys(getPrevWeekKey(weekKey))
  const thisWeekSoFar = getWeekDateKeys(weekKey).filter(d => d <= today)

  // 통계(히트맵/최장 스트릭)용 과거 이력: 지지난주부터 10주 전까지.
  // 물(1)은 3일 중 2일 패턴, 스트레칭(2)은 주말 제외, 운동(3)은 월/수/금.
  // 최근 2주는 아래 개별 시드가 담당하므로 여기선 건드리지 않는다 (기대값 보존).
  const history = []
  let wk = getPrevWeekKey(getPrevWeekKey(weekKey))
  for (let w = 0; w < 8; w++) {
    getWeekDateKeys(wk).forEach((date, dayIdx) => {
      if ((w + dayIdx) % 3 !== 0) history.push({ user_id: uid, routine_id: 1, date })
      if (dayIdx < 5) history.push({ user_id: uid, routine_id: 2, date })
      if (dayIdx === 0 || dayIdx === 2 || dayIdx === 4) history.push({ user_id: uid, routine_id: 3, date })
    })
    wk = getPrevWeekKey(wk)
  }

  return {
    routines: [
      { id: 1, user_id: uid, name: '물 2L 마시기', emoji: '💧', sort_order: 0, weekly_target: null },
      { id: 2, user_id: uid, name: '아침 스트레칭', emoji: '🧘', sort_order: 1, weekly_target: null },
      { id: 3, user_id: uid, name: '운동', emoji: '💪', sort_order: 2, weekly_target: 3 },
    ],
    routine_checks: [
      // 물: 3일 연속 (오늘은 아직)
      { user_id: uid, routine_id: 1, date: d1 },
      { user_id: uid, routine_id: 1, date: d2 },
      { user_id: uid, routine_id: 1, date: d3 },
      // 스트레칭: 오늘 완료
      { user_id: uid, routine_id: 2, date: today },
      // 운동(주3회): 지난주 3회 달성 + 이번 주 최대 2회 진행
      { user_id: uid, routine_id: 3, date: prevWeek[0] },
      { user_id: uid, routine_id: 3, date: prevWeek[2] },
      { user_id: uid, routine_id: 3, date: prevWeek[4] },
      ...thisWeekSoFar.slice(0, 2).map(date => ({ user_id: uid, routine_id: 3, date })),
      ...history,
    ],
    todos: [
      { id: 101, user_id: uid, name: '국시 원서 접수', emoji: '📝', done: false, done_at: null, when: today, deadline: today, order_index: 0, created_at: '2026-07-01T09:00:00Z' },
      { id: 102, user_id: uid, name: 'CPX 스터디 자료 정리', emoji: '📚', done: false, done_at: null, when: null, deadline: null, order_index: 1, created_at: '2026-07-02T09:00:00Z' },
      { id: 103, user_id: uid, name: '안경 찾으러 가기', emoji: '👓', done: true, done_at: d1, when: d1, deadline: null, order_index: 2, created_at: '2026-07-03T09:00:00Z' },
      // 투두 탭 검증용 케이스: 지난(기한 지남 포함)/오늘/예정/나중에 (미완료만 — 통계 기대값 보존)
      { id: 104, user_id: uid, name: '보험 서류 제출', emoji: '📌', done: false, done_at: null, when: d2, deadline: d1, order_index: 3, created_at: '2026-07-04T09:00:00Z' },
      { id: 105, user_id: uid, name: '기숙사 신청서 내기', emoji: '📌', done: false, done_at: null, when: d1, deadline: null, order_index: 4, created_at: '2026-07-05T09:00:00Z' },
      { id: 106, user_id: uid, name: '모의고사 오답 정리', emoji: '📌', done: false, done_at: null, when: getNextDateKey(today), deadline: null, order_index: 5, created_at: '2026-07-06T09:00:00Z' },
      { id: 107, user_id: uid, name: '멘토링 자료 준비', emoji: '📌', done: false, done_at: null, when: getNextDateKey(getNextDateKey(getNextDateKey(today))), deadline: getNextDateKey(getNextDateKey(getNextDateKey(today))), order_index: 6, created_at: '2026-07-07T09:00:00Z' },
      { id: 108, user_id: uid, name: '독서: 제로 투 원', emoji: '📌', done: false, done_at: null, when: null, deadline: null, order_index: 7, created_at: '2026-07-08T09:00:00Z' },
    ],
    todo_tags: [
      { id: 201, user_id: uid, name: '공부', color_index: 0 },
      { id: 202, user_id: uid, name: '생활', color_index: 1 },
    ],
    todo_tag_links: [
      { todo_id: 101, tag_id: 201, user_id: uid },
      { todo_id: 102, tag_id: 201, user_id: uid },
      { todo_id: 103, tag_id: 202, user_id: uid },
      { todo_id: 104, tag_id: 202, user_id: uid },
      { todo_id: 106, tag_id: 201, user_id: uid },
      { todo_id: 107, tag_id: 201, user_id: uid },
      { todo_id: 108, tag_id: 202, user_id: uid },
    ],
  }
}

function matches(row, filters) {
  return filters.every(([col, val]) => row[col] === val)
}

export function createMockClient() {
  const db = seedData()
  // 마이그레이션 이펙트가 목 데이터를 덮어쓰지 않게 스킵 처리
  try { localStorage.setItem('migrated_to_supabase', 'true') } catch { /* SSR 등 무시 */ }

  const session = { user: MOCK_USER }
  const auth = {
    getSession: async () => ({ data: { session }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithOAuth: async () => ({ data: {}, error: null }),
    signOut: async () => ({ data: {}, error: null }),
  }

  function from(table) {
    const rows = db[table] || (db[table] = [])
    const pk = PRIMARY_KEYS[table] || ['id']
    const state = { op: 'select', payload: null, filters: [] }

    function execute() {
      const asArray = p => (Array.isArray(p) ? p : [p])
      switch (state.op) {
        case 'select':
          return rows.filter(r => matches(r, state.filters)).map(r => ({ ...r }))
        case 'insert':
          rows.push(...asArray(state.payload).map(r => ({ ...r })))
          return null
        case 'update':
          rows.forEach((r, i) => { if (matches(r, state.filters)) rows[i] = { ...r, ...state.payload } })
          return null
        case 'upsert':
          for (const p of asArray(state.payload)) {
            const idx = rows.findIndex(r => pk.every(k => r[k] === p[k]))
            if (idx >= 0) rows[idx] = { ...rows[idx], ...p }
            else rows.push({ ...p })
          }
          return null
        case 'delete': {
          const keep = rows.filter(r => !matches(r, state.filters))
          rows.length = 0
          rows.push(...keep)
          return null
        }
      }
    }

    const builder = {
      select() { state.op = 'select'; return builder },
      insert(p) { state.op = 'insert'; state.payload = p; return builder },
      update(p) { state.op = 'update'; state.payload = p; return builder },
      upsert(p) { state.op = 'upsert'; state.payload = p; return builder },
      delete() { state.op = 'delete'; return builder },
      eq(col, val) { state.filters.push([col, val]); return builder },
      order() { return builder },
      then(resolve, reject) {
        try { resolve({ data: execute(), error: null }) } catch (e) { reject(e) }
      },
    }
    return builder
  }

  return { auth, from }
}
