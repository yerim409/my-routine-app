import { useState } from 'react'
import RoutineTab from './components/RoutineTab'
import TodoTab from './components/TodoTab'
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

export default function App() {
  const [tab, setTab] = useState('routine')
  const now = new Date()
  const todayKey = getLocalDateKey(now)
  const [selectedDate, setSelectedDate] = useState(todayKey)

  const isToday = selectedDate === todayKey

  const displayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
  })

  // 날짜 기반으로 매일 다른 명언
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000)
  const quote = QUOTES[dayOfYear % QUOTES.length]

  return (
    <div className="flex flex-col min-h-screen bg-[#f0fdf4]">
      {/* 헤더 */}
      <div className="px-5 pt-14 pb-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <label className="flex items-center gap-1 cursor-pointer">
            <span className={`text-base font-semibold ${isToday ? 'text-gray-800' : 'text-emerald-500'}`}>
              {displayDate}
            </span>
            <span className="text-gray-300 text-sm">▾</span>
            <input
              type="date"
              value={selectedDate}
              max={todayKey}
              onChange={e => e.target.value && setSelectedDate(e.target.value)}
              className="absolute opacity-0 w-0 h-0"
            />
          </label>
          {!isToday && (
            <button
              onClick={() => setSelectedDate(todayKey)}
              className="text-xs text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full font-medium"
            >
              오늘로
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 italic">"{quote}"</p>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-100 bg-white">
        {['routine', 'todo'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold transition-all border-b-2 ${
              tab === t ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-400'
            }`}
          >
            {t === 'routine' ? '🔄 루틴' : '✅ 할 일'}
          </button>
        ))}
      </div>

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-auto pb-10">
        {tab === 'routine' ? <RoutineTab selectedDate={selectedDate} /> : <TodoTab />}
      </div>
    </div>
  )
}
