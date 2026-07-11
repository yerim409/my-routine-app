import { useState, useEffect, useRef } from 'react'
import { useAuth } from './hooks/useAuth'
import { supabase } from './lib/supabase'
import RoutineTab from './components/RoutineTab'
import TodoTab from './components/TodoTab'
import StatsTab from './components/StatsTab'
import AuthScreen from './components/AuthScreen'
import './index.css'

const QUOTES = [
  "작은 습관이 큰 변화를 만든다.",
  "오늘 할 수 있는 일을 내일로 미루지 마라.",
  "성공은 매일의 작은 노력이 쌓인 결과다.",
  "완벽하지 않아도 괜찮다. 꾸준함이 답이다.",
  "한 걸음씩, 천천히, 그러나 멈추지 않게.",
  "지금 이 순간이 남은 인생 중 가장 젊은 날이다.",
  "힘든 일을 먼저 하라. 그러면 하루가 편해진다.",
  "규칙적인 생활이 자유를 만든다.",
  "노력은 배신하지 않는다.",
  "오늘의 나는 어제의 내가 만든 것이다.",
  "작은 것에 감사하는 사람이 큰 것을 얻는다.",
  "시작이 반이다.",
  "실패는 성공의 어머니다.",
  "꿈을 꾸는 자만이 꿈을 이룰 수 있다.",
  "지식은 힘이다.",
  "인내는 쓰고 열매는 달다.",
  "천 리 길도 한 걸음부터.",
  "건강이 최고의 재산이다.",
  "배움에는 끝이 없다.",
  "오늘의 땀이 내일의 빛이 된다.",
  "포기하지 않는 자가 승리한다.",
  "자신을 믿어라.",
  "변화는 두렵지만 성장은 아름답다.",
  "좋은 습관은 두 번째 천성이다.",
  "매일 조금씩 더 나은 사람이 되자.",
  "어제보다 나은 오늘을 살자.",
  "꾸준함은 재능을 이긴다.",
  "지금 이 순간에 최선을 다하자.",
  "행동이 없는 꿈은 그냥 꿈일 뿐이다.",
  "나 자신과의 약속을 지키자.",
]

function getLocalDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function migrateLocalStorageToSupabase(userId) {
  if (localStorage.getItem('migrated_to_supabase') === 'true') return

  try {
    // 1. routines
    const routines = JSON.parse(localStorage.getItem('routines') || '[]')
    if (routines.length > 0) {
      const { error } = await supabase.from('routines').upsert(
        routines.map((r, i) => ({ id: r.id, user_id: userId, name: r.name, emoji: r.emoji, sort_order: i }))
      )
      if (error) throw error
    }

    // 2. routine_checks (checked=true rows only)
    const checkEntries = []
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith('checks_')) continue
      const date = key.replace('checks_', '')
      const checks = JSON.parse(localStorage.getItem(key) || '{}')
      for (const [routineId, checked] of Object.entries(checks)) {
        if (checked) checkEntries.push({ user_id: userId, routine_id: Number(routineId), date })
      }
    }
    if (checkEntries.length > 0) {
      const { error } = await supabase.from('routine_checks').upsert(checkEntries)
      if (error) throw error
    }

    // 3. todos
    const todos = JSON.parse(localStorage.getItem('todos') || '[]')
    if (todos.length > 0) {
      const { error } = await supabase.from('todos').upsert(
        todos.map(t => ({
          id: t.id, user_id: userId, name: t.name, emoji: t.emoji || '📌',
          done: t.done || false, done_at: t.done ? (t.when || null) : null,
          when: t.when || null, deadline: t.deadline || null,
        }))
      )
      if (error) throw error
    }

    // 4. todo_tags
    const tags = JSON.parse(localStorage.getItem('todo_tags') || '[]')
    if (tags.length > 0) {
      const { error } = await supabase.from('todo_tags').upsert(
        tags.map(t => ({ id: t.id, user_id: userId, name: t.name, color_index: t.colorIndex || 0 }))
      )
      if (error) throw error
    }

    // 5. todo_tag_links
    const linkEntries = []
    for (const todo of todos) {
      for (const tagId of (todo.tags || [])) {
        linkEntries.push({ todo_id: todo.id, tag_id: tagId, user_id: userId })
      }
    }
    if (linkEntries.length > 0) {
      const { error } = await supabase.from('todo_tag_links').upsert(linkEntries)
      if (error) throw error
    }

    localStorage.setItem('migrated_to_supabase', 'true')
  } catch (err) {
    console.error('Migration failed:', err)
  }
}

export default function App() {
  const { user, loading, signInWithGoogle, signOut } = useAuth()
  const dateInputRef = useRef(null)
  const [tab, setTab] = useState('routine')
  const [migrating, setMigrating] = useState(false)

  const now = new Date()
  const todayKey = getLocalDateKey(now)
  const [selectedDate, setSelectedDate] = useState(todayKey)

  useEffect(() => {
    if (!user) return
    if (localStorage.getItem('migrated_to_supabase') === 'true') return
    // 일회성 마이그레이션 게이트 — 로그인 직후 한 번만 실행되는 외부 동기화라 예외 허용
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMigrating(true)
    migrateLocalStorageToSupabase(user.id).finally(() => setMigrating(false))
  }, [user])

  if (loading || migrating) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f0fdf4]">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <AuthScreen onSignIn={signInWithGoogle} />
  }

  const isToday = selectedDate === todayKey
  const displayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
  })
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
  const quote = QUOTES[dayOfYear % QUOTES.length]

  return (
    <div className="min-h-screen bg-[#f0fdf4]">
      <div className="mx-auto max-w-[480px] lg:max-w-5xl lg:px-6 flex flex-col min-h-screen">
        <header className="px-5 pt-14 pb-4 bg-white border-b border-gray-100 lg:mt-6 lg:rounded-3xl lg:border lg:pt-5 lg:px-8">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-emerald-500 tracking-wide">🌱 MyRoutine</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTab(tab === 'stats' ? 'routine' : 'stats')}
                className={`hidden lg:block text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                  tab === 'stats' ? 'bg-emerald-400 text-white' : 'bg-gray-100 text-gray-400'
                }`}
              >
                📊 통계
              </button>
              <button
                onClick={signOut}
                className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full"
              >
                로그아웃
              </button>
            </div>
          </div>
          {tab !== 'stats' && (
          <div className="flex items-center justify-between mb-1">
            <div className="relative flex items-center gap-1">
              <button
                onClick={() => {
                  try { dateInputRef.current?.showPicker() }
                  catch { dateInputRef.current?.click() }
                }}
                className="flex items-center gap-1 cursor-pointer"
              >
                <span className={`text-base font-semibold ${isToday ? 'text-gray-800' : 'text-emerald-500'}`}>
                  {displayDate}
                </span>
                <span className="text-gray-300 text-sm">▾</span>
              </button>
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                max={todayKey}
                onChange={e => e.target.value && setSelectedDate(e.target.value)}
                className="absolute opacity-0 top-0 left-0 w-8 h-8"
              />
            </div>
            {!isToday && (
              <button
                onClick={() => setSelectedDate(todayKey)}
                className="text-xs text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full font-medium"
              >
                오늘로
              </button>
            )}
          </div>
          )}
          <p className="text-xs text-gray-400 italic">"{quote}"</p>
        </header>

        <nav className="flex border-b border-gray-100 bg-white lg:hidden">
          {['routine', 'todo', 'stats'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold transition-all border-b-2 ${
                tab === t ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-400'
              }`}
            >
              {t === 'routine' ? '🔄 루틴' : t === 'todo' ? '✅ 할 일' : '📊 통계'}
            </button>
          ))}
        </nav>

        {tab === 'stats' ? (
          <main className="flex-1 pb-10 lg:mt-2">
            <StatsTab userId={user.id} />
          </main>
        ) : (
          <main className="flex-1 pb-10 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start lg:mt-2">
            <section className={tab === 'routine' ? 'block' : 'hidden lg:block'}>
              <h2 className="hidden lg:block px-4 pt-4 text-sm font-bold text-gray-400">🔄 루틴</h2>
              <RoutineTab selectedDate={selectedDate} userId={user.id} />
            </section>
            <section className={tab === 'todo' ? 'block' : 'hidden lg:block'}>
              <h2 className="hidden lg:block px-4 pt-4 text-sm font-bold text-gray-400">✅ 할 일</h2>
              <TodoTab userId={user.id} />
            </section>
          </main>
        )}
      </div>
    </div>
  )
}
