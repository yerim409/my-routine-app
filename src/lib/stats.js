// 통계 대시보드용 순수 계산 함수. 날짜 규칙은 lib/dates.js를 따른다 (로컬 타임존, 주 = 월요일 시작).
import {
  getPrevDateKey,
  getNextDateKey,
  getWeekKey,
  getPrevWeekKey,
  getWeekDateKeys,
  countWeekChecks,
} from './dates.js'

function countDayChecks(allChecks, dateKey) {
  return Object.keys(allChecks[dateKey] || {}).length
}

// 최근 weeks주의 히트맵 데이터. 주(열) 배열 × 7일(월~일).
// 미래 날짜는 count: null (렌더링에서 투명 처리).
export function buildHeatmap(allChecks, todayKey, weeks = 12) {
  const weekKeys = []
  let wk = getWeekKey(todayKey)
  for (let i = 0; i < weeks; i++) {
    weekKeys.unshift(wk)
    wk = getPrevWeekKey(wk)
  }
  return weekKeys.map(weekKey =>
    getWeekDateKeys(weekKey).map(dateKey => ({
      dateKey,
      count: dateKey > todayKey ? null : countDayChecks(allChecks, dateKey),
    }))
  )
}

// 매일 루틴의 최장 연속 일수 (최근 365일)
export function calculateLongestStreak(routineId, allChecks, todayKey) {
  let longest = 0
  let cur = 0
  let ds = todayKey
  for (let i = 0; i < 365; i++) {
    if (allChecks[ds]?.[routineId]) {
      cur++
      if (cur > longest) longest = cur
    } else {
      cur = 0
    }
    ds = getPrevDateKey(ds)
  }
  return longest
}

// 주 N회 루틴의 최장 연속 달성 주 수 (최근 52주)
export function calculateLongestWeeklyStreak(routineId, weeklyTarget, allChecks, todayKey) {
  let longest = 0
  let cur = 0
  let wk = getWeekKey(todayKey)
  for (let i = 0; i < 52; i++) {
    if (countWeekChecks(routineId, allChecks, wk) >= weeklyTarget) {
      cur++
      if (cur > longest) longest = cur
    } else {
      cur = 0
    }
    wk = getPrevWeekKey(wk)
  }
  return longest
}

// 기간 내 수행 횟수 (fromKey, toKey 포함)
export function countInRange(routineId, allChecks, fromKey, toKey) {
  let n = 0
  for (const ds of Object.keys(allChecks)) {
    if (ds >= fromKey && ds <= toKey && allChecks[ds][routineId]) n++
  }
  return n
}

// 이번 주 누적 체크 수 vs 지난주 같은 요일까지 누적
export function weeklyComparison(allChecks, todayKey) {
  const thisWeekKey = getWeekKey(todayKey)
  const thisDays = getWeekDateKeys(thisWeekKey).filter(d => d <= todayKey)
  const lastDays = getWeekDateKeys(getPrevWeekKey(thisWeekKey)).slice(0, thisDays.length)
  const sum = days => days.reduce((s, d) => s + countDayChecks(allChecks, d), 0)
  const thisCount = sum(thisDays)
  const lastCount = sum(lastDays)
  return { thisCount, lastCount, diff: thisCount - lastCount }
}

// 모든 매일 루틴을 완료한 날 수 (매일 루틴이 없으면 0)
export function countPerfectDays(dailyRoutineIds, allChecks, fromKey, toKey) {
  if (dailyRoutineIds.length === 0) return 0
  let n = 0
  let ds = fromKey
  while (ds <= toKey) {
    const day = allChecks[ds] || {}
    if (dailyRoutineIds.every(id => day[id])) n++
    ds = getNextDateKey(ds)
  }
  return n
}
