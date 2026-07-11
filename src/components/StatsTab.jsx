import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  getTodayKey,
  getPrevDateKey,
  getWeekKey,
  getPrevWeekKey,
  countWeekChecks,
  calculateStreak,
  calculateWeeklyStreak,
} from '../lib/dates'
import {
  buildHeatmap,
  calculateLongestStreak,
  calculateLongestWeeklyStreak,
  countInRange,
  weeklyComparison,
  countPerfectDays,
} from '../lib/stats'

// 통계는 항상 오늘 기준 — selectedDate(과거 조회)와 무관
const HEATMAP_WEEKS = 12

function heatCellColor(count) {
  if (count === null) return 'bg-transparent'
  if (count === 0) return 'bg-gray-100'
  if (count === 1) return 'bg-emerald-200'
  if (count === 2) return 'bg-emerald-300'
  return 'bg-emerald-500'
}

function daysAgoKey(todayKey, days) {
  let d = todayKey
  for (let i = 0; i < days; i++) d = getPrevDateKey(d)
  return d
}

function Card({ children, className = '' }) {
  return (
    <div className={`mx-4 mb-4 bg-white rounded-3xl p-5 shadow-sm border border-gray-50 ${className}`}>
      {children}
    </div>
  )
}

function WeeklySummaryCard({ allChecks, dailyRoutineIds, today }) {
  const { thisCount, diff } = weeklyComparison(allChecks, today)
  const weekKey = getWeekKey(today)
  const perfectDays = countPerfectDays(dailyRoutineIds, allChecks, weekKey, today)

  return (
    <Card>
      <p className="text-xs text-gray-400 font-medium mb-3">이번 주</p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-gray-900">
            {thisCount}<span className="text-lg text-gray-400">회 체크</span>
          </p>
          <p className={`text-xs font-semibold mt-1 ${diff > 0 ? 'text-emerald-500' : diff < 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {diff > 0 ? `▲ ${diff}` : diff < 0 ? `▼ ${-diff}` : '—'} 지난주 이맘때 대비
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-amber-400">⭐ {perfectDays}</p>
          <p className="text-xs text-gray-400 mt-0.5">완벽한 날</p>
        </div>
      </div>
    </Card>
  )
}

function HeatmapCard({ allChecks, today }) {
  const heatmap = buildHeatmap(allChecks, today, HEATMAP_WEEKS)

  return (
    <Card>
      <p className="text-xs text-gray-400 font-medium mb-3">최근 {HEATMAP_WEEKS}주 기록</p>
      <div className="flex gap-1 justify-between">
        <div className="flex flex-col gap-1 justify-between text-[9px] text-gray-300 pr-0.5">
          {['월', '', '수', '', '금', '', '일'].map((d, i) => (
            <span key={i} className="h-3 leading-3">{d}</span>
          ))}
        </div>
        {heatmap.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1 flex-1">
            {week.map(({ dateKey, count }) => (
              <div
                key={dateKey}
                title={count === null ? undefined : `${dateKey} · ${count}회`}
                className={`h-3 rounded-[3px] ${heatCellColor(count)} ${dateKey === today ? 'ring-2 ring-emerald-500 ring-offset-1' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-3 justify-end text-[10px] text-gray-300">
        적음
        {[0, 1, 2, 3].map(n => <span key={n} className={`w-3 h-3 rounded-[3px] ${heatCellColor(n)}`} />)}
        많음
      </div>
    </Card>
  )
}

function RoutineStatRow({ routine, allChecks, today }) {
  const isWeekly = !!routine.weekly_target
  const monthAgo = daysAgoKey(today, 29)
  const count30 = countInRange(routine.id, allChecks, monthAgo, today)

  let current, longest, unit
  if (isWeekly) {
    current = calculateWeeklyStreak(routine.id, routine.weekly_target, allChecks, today).streak
    longest = calculateLongestWeeklyStreak(routine.id, routine.weekly_target, allChecks, today)
    unit = '주'
  } else {
    current = calculateStreak(routine.id, allChecks, today).streak
    longest = calculateLongestStreak(routine.id, allChecks, today)
    unit = '일'
  }

  // 주 N회 루틴: 최근 4주 달성 여부 도트
  const recentWeeks = []
  if (isWeekly) {
    let wk = getWeekKey(today)
    for (let i = 0; i < 4; i++) {
      recentWeeks.unshift(countWeekChecks(routine.id, allChecks, wk) >= routine.weekly_target)
      wk = getPrevWeekKey(wk)
    }
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-b-0">
      <span className="text-lg">{routine.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{routine.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {isWeekly ? `주 ${routine.weekly_target}회` : '매일'} · 최근 30일 {count30}회
        </p>
      </div>
      {isWeekly && (
        <div className="flex gap-1">
          {recentWeeks.map((ok, i) => (
            <span key={i} className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-gray-200'}`} />
          ))}
        </div>
      )}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-orange-400">🔥 {current}{unit}</p>
        <p className="text-[10px] text-gray-300">최장 {longest}{unit}</p>
      </div>
    </div>
  )
}

export default function StatsTab({ userId }) {
  const today = getTodayKey()
  const [routines, setRoutines] = useState([])
  const [allChecks, setAllChecks] = useState({})
  const [doneThisWeek, setDoneThisWeek] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function load() {
      const weekKey = getWeekKey(today)
      const [{ data: routinesData }, { data: checksData }, { data: todosData }] = await Promise.all([
        supabase.from('routines').select('*').eq('user_id', userId).order('sort_order'),
        supabase.from('routine_checks').select('routine_id, date').eq('user_id', userId),
        supabase.from('todos').select('done, done_at').eq('user_id', userId),
      ])
      if (cancelled) return

      setRoutines(routinesData || [])
      const map = {}
      for (const { routine_id, date } of (checksData || [])) {
        if (!map[date]) map[date] = {}
        map[date][routine_id] = true
      }
      setAllChecks(map)
      setDoneThisWeek(
        (todosData || []).filter(t => t.done && t.done_at && t.done_at >= weekKey && t.done_at <= today).length
      )
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [userId, today])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const dailyRoutineIds = routines.filter(r => !r.weekly_target).map(r => r.id)

  return (
    <div className="pt-4 pb-8 lg:grid lg:grid-cols-2 lg:gap-2 lg:items-start">
      <div>
        <WeeklySummaryCard allChecks={allChecks} dailyRoutineIds={dailyRoutineIds} today={today} />
        <HeatmapCard allChecks={allChecks} today={today} />
      </div>
      <div>
        <Card>
          <p className="text-xs text-gray-400 font-medium mb-1">루틴별 기록</p>
          {routines.length === 0 ? (
            <p className="text-sm text-gray-300 text-center py-8">아직 루틴이 없어요</p>
          ) : (
            routines.map(r => (
              <RoutineStatRow key={r.id} routine={r} allChecks={allChecks} today={today} />
            ))
          )}
        </Card>
        <Card>
          <p className="text-sm text-gray-600">
            ✅ 이번 주 완료한 할 일 <span className="font-bold text-emerald-500">{doneThisWeek}개</span>
          </p>
        </Card>
      </div>
    </div>
  )
}
