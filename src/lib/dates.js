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

export function getNextDateKey(dateKey) {
  const date = parseDateKey(dateKey)
  date.setDate(date.getDate() + 1)
  return getDateKey(date)
}

// '2026-07-15' → '오늘' / '내일' / '어제' / '7/15' / (연도 다르면) '2025.12.30'
export function formatRelativeDate(dateKey, todayKey = getTodayKey()) {
  if (dateKey === todayKey) return '오늘'
  if (dateKey === getNextDateKey(todayKey)) return '내일'
  if (dateKey === getPrevDateKey(todayKey)) return '어제'
  const d = parseDateKey(dateKey)
  const t = parseDateKey(todayKey)
  return d.getFullYear() === t.getFullYear()
    ? `${d.getMonth() + 1}/${d.getDate()}`
    : `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
}

// 기한 → D-day 표기. urgent는 3일 이내/지남 (경고색 판단용)
export function formatDday(deadlineKey, todayKey = getTodayKey()) {
  const diff = Math.round((parseDateKey(deadlineKey) - parseDateKey(todayKey)) / 86400000)
  if (diff < 0) return { label: '지남', urgent: true }
  if (diff === 0) return { label: '오늘까지', urgent: true }
  return { label: `D-${diff}`, urgent: diff <= 3 }
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
