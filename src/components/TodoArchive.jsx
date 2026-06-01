import { useState } from 'react'

const TAG_COLORS = [
  { bg: 'bg-sky-100', text: 'text-sky-600' },
  { bg: 'bg-violet-100', text: 'text-violet-600' },
  { bg: 'bg-rose-100', text: 'text-rose-600' },
  { bg: 'bg-amber-100', text: 'text-amber-600' },
  { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  { bg: 'bg-orange-100', text: 'text-orange-600' },
  { bg: 'bg-pink-100', text: 'text-pink-600' },
  { bg: 'bg-blue-100', text: 'text-blue-600' },
]

function TagChip({ tag }) {
  const color = TAG_COLORS[tag.color_index % TAG_COLORS.length]
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${color.bg} ${color.text}`}>
      {tag.name}
    </span>
  )
}

function CompletedTodoItem({ todo, tags }) {
  const todoTags = tags.filter(t => (todo.tag_ids || []).includes(t.id))
  return (
    <div className="bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-gray-50 flex items-center gap-3 opacity-60">
      <div className="w-6 h-6 rounded-full bg-emerald-400 border-emerald-400 flex items-center justify-center flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className="text-lg">{todo.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-400 line-through">{todo.name}</p>
        {todoTags.length > 0 && (
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {todoTags.map(tag => <TagChip key={tag.id} tag={tag} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function BottomSheet({ date, todos, tags, onClose }) {
  const items = todos.filter(t => t.done_at === date)
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-3xl p-6 pb-10 max-h-[70vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900">
            {date} 완료한 일
          </h2>
          <button onClick={onClose} className="text-gray-300 text-xl p-1">✕</button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-gray-300 text-center py-8">완료한 항목이 없어요</p>
        ) : (
          <div className="space-y-2">
            {items.map(todo => <CompletedTodoItem key={todo.id} todo={todo} tags={tags} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function ArchiveCalendar({ doneTodos, tags }) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState(null)

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })

  // Build set of dates with completed todos
  const datesWithDone = new Set(doneTodos.map(t => t.done_at).filter(Boolean))

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    const today = now
    if (viewYear === today.getFullYear() && viewMonth === today.getMonth()) return
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth()

  return (
    <>
      {selectedDate && (
        <BottomSheet
          date={selectedDate}
          todos={doneTodos}
          tags={tags}
          onClose={() => setSelectedDate(null)}
        />
      )}

      <div className="mx-4 bg-white rounded-3xl p-5 shadow-sm border border-gray-50">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1 text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <p className="text-sm font-semibold text-gray-700">{monthName}</p>
          <button onClick={nextMonth} className={`p-1 transition-colors ${isCurrentMonth ? 'text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {['일', '월', '화', '수', '목', '금', '토'].map(d => (
            <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const hasDone = datesWithDone.has(dateStr)
            const isToday = dateStr === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

            return (
              <button
                key={day}
                onClick={() => hasDone && setSelectedDate(dateStr)}
                className="flex flex-col items-center gap-0.5 py-1"
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                  isToday ? 'border-2 border-emerald-400 text-emerald-500' : 'text-gray-500'
                }`}>
                  {day}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${hasDone ? 'bg-emerald-400' : 'invisible'}`} />
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

function TagSection({ tag, todos, tags }) {
  const [open, setOpen] = useState(false)
  const items = tag === null
    ? todos.filter(t => !t.tag_ids || t.tag_ids.length === 0)
    : todos.filter(t => (t.tag_ids || []).includes(tag.id))

  if (items.length === 0) return null

  const label = tag ? tag.name : '태그 없음'
  const color = tag ? TAG_COLORS[tag.color_index % TAG_COLORS.length] : { bg: 'bg-gray-100', text: 'text-gray-400' }

  return (
    <div className="mx-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-2.5 px-1"
      >
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${color.bg} ${color.text}`}>{label}</span>
          <span className="text-xs text-gray-400">{items.length}개</span>
        </div>
        <svg className={`w-4 h-4 text-gray-300 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="space-y-2 pb-2">
          {items.map(todo => <CompletedTodoItem key={todo.id} todo={todo} tags={tags} />)}
        </div>
      )}
    </div>
  )
}

export default function TodoArchive({ doneTodos, tags }) {
  if (doneTodos.length === 0) return null

  return (
    <div className="mt-6">
      <div className="px-5 mb-3">
        <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">완료된 할 일</p>
      </div>

      {/* Calendar */}
      <ArchiveCalendar doneTodos={doneTodos} tags={tags} />

      {/* Tag sections */}
      <div className="mt-4 space-y-1">
        {tags.map(tag => (
          <TagSection key={tag.id} tag={tag} todos={doneTodos} tags={tags} />
        ))}
        <TagSection tag={null} todos={doneTodos} tags={tags} />
      </div>
    </div>
  )
}
