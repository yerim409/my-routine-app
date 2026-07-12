import { useState } from 'react'
import { formatRelativeDate } from '../lib/dates'

const TAG_COLORS = [
  { bg: 'bg-sky-100', text: 'text-sky-600', dot: 'bg-sky-400' },
  { bg: 'bg-violet-100', text: 'text-violet-600', dot: 'bg-violet-400' },
  { bg: 'bg-rose-100', text: 'text-rose-600', dot: 'bg-rose-400' },
  { bg: 'bg-amber-100', text: 'text-amber-600', dot: 'bg-amber-400' },
  { bg: 'bg-emerald-100', text: 'text-emerald-600', dot: 'bg-emerald-400' },
  { bg: 'bg-orange-100', text: 'text-orange-600', dot: 'bg-orange-400' },
  { bg: 'bg-pink-100', text: 'text-pink-600', dot: 'bg-pink-400' },
  { bg: 'bg-blue-100', text: 'text-blue-600', dot: 'bg-blue-400' },
]

function getArchiveDate(todo) {
  return todo.when || null
}

function TagSelectorSimple({ tags, selectedIds, onToggle, onCreateTag }) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const handleCreate = () => {
    if (!newName.trim()) return
    onCreateTag(newName.trim())
    setNewName('')
    setAdding(false)
  }
  return (
    <div>
      <p className="text-xs text-gray-400 mb-2 px-1">태그</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(tag => {
          const color = TAG_COLORS[tag.color_index % TAG_COLORS.length]
          const selected = selectedIds.includes(tag.id)
          return (
            <button key={tag.id} onClick={() => onToggle(tag.id)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all
                ${selected ? `${color.bg} ${color.text} ring-2 ring-offset-1 ring-current` : `${color.bg} ${color.text} opacity-70`}`}>
              {tag.name}
            </button>
          )
        })}
        {adding ? (
          <div className="flex items-center gap-1">
            <input autoFocus type="text" value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setAdding(false) }}
              placeholder="태그명"
              className="w-20 bg-gray-50 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-300" />
            <button onClick={handleCreate} className="text-xs text-emerald-500 font-medium">추가</button>
            <button onClick={() => setAdding(false)} className="text-xs text-gray-400">취소</button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-400 hover:bg-gray-200 transition-all">
            + 새 태그
          </button>
        )}
      </div>
    </div>
  )
}

function CompletedTodoItem({ todo, tags, onUpdate, onCreateTag }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    name: todo.name,
    when: todo.when || '',
    deadline: todo.deadline || '',
    tag_ids: todo.tag_ids || [],
  })
  const todoTags = tags.filter(t => (todo.tag_ids || []).includes(t.id))

  const saveEdit = () => {
    if (draft.name.trim()) onUpdate(todo.id, {
      name: draft.name.trim(),
      when: draft.when || null,
      deadline: draft.deadline || null,
      tag_ids: draft.tag_ids,
    })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="bg-gray-50 rounded-2xl p-4 my-2">
        <input type="text" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}
          className="w-full bg-white rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-300" autoFocus />
        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1 px-1">할 날짜</p>
            <input type="date" value={draft.when} onChange={e => setDraft({ ...draft, when: e.target.value })}
              className="w-full bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1 px-1">기한</p>
            <input type="date" value={draft.deadline} onChange={e => setDraft({ ...draft, deadline: e.target.value })}
              className="w-full bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
          </div>
        </div>
        <div className="mb-3">
          <TagSelectorSimple
            tags={tags}
            selectedIds={draft.tag_ids}
            onToggle={id => setDraft(prev => ({
              ...prev,
              tag_ids: prev.tag_ids.includes(id) ? prev.tag_ids.filter(t => t !== id) : [...prev.tag_ids, id]
            }))}
            onCreateTag={async (name) => {
              const id = await onCreateTag(name)
              setDraft(prev => ({ ...prev, tag_ids: [...prev.tag_ids, id] }))
            }}
          />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(false)} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 bg-white">취소</button>
          <button onClick={saveEdit} className="flex-1 py-2.5 rounded-xl text-sm text-white bg-emerald-400 font-medium">저장</button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-2.5 py-2.5 border-b border-gray-50 last:border-b-0 cursor-pointer"
      onClick={() => setEditing(true)}
    >
      <span className="w-[18px] h-[18px] rounded-full bg-emerald-300 flex items-center justify-center flex-shrink-0">
        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <p className="flex-1 min-w-0 text-sm text-gray-400 line-through truncate">{todo.name}</p>
      {todoTags.length > 0 && (
        <span className="flex gap-1 flex-shrink-0 items-center">
          {todoTags.map(tag => (
            <span key={tag.id} title={tag.name}
              className={`w-[7px] h-[7px] rounded-full ${TAG_COLORS[tag.color_index % TAG_COLORS.length].dot}`} />
          ))}
        </span>
      )}
    </div>
  )
}

function BottomSheet({ date, todos, tags, onUpdate, onCreateTag, onClose }) {
  const items = todos.filter(t => getArchiveDate(t) === date)
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end lg:items-center lg:justify-center" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-3xl p-6 pb-10 max-h-[70vh] overflow-y-auto lg:max-w-md lg:rounded-3xl lg:pb-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900">{date} 완료한 일</h2>
          <button onClick={onClose} className="text-gray-300 text-xl p-1">✕</button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-gray-300 text-center py-8">완료한 항목이 없어요</p>
        ) : (
          <div>
            {items.map(todo => (
              <CompletedTodoItem key={todo.id} todo={todo} tags={tags} onUpdate={onUpdate} onCreateTag={onCreateTag} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ArchiveCalendar({ doneTodos, tags, onUpdate, onCreateTag }) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState(null)

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })

  // Build set of dates with completed todos
  const datesWithDone = new Set(doneTodos.map(getArchiveDate).filter(Boolean))

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
          onUpdate={onUpdate}
          onCreateTag={onCreateTag}
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

export default function TodoArchive({ doneTodos, tags, onUpdate, onCreateTag }) {
  const [showAll, setShowAll] = useState(false)

  if (doneTodos.length === 0) return null

  // 로그북: 완료 항목을 할 날짜(when) 기준 최근순 그룹으로 — 날짜 없는 항목은 맨 뒤
  const groups = {}
  for (const todo of doneTodos) {
    const dateKey = getArchiveDate(todo) || ''
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(todo)
  }
  const dateKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a))
  const visibleKeys = showAll ? dateKeys : dateKeys.slice(0, 3)

  return (
    <div className="mt-6">
      <div className="px-5 mb-3">
        <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">완료된 할 일</p>
      </div>

      <ArchiveCalendar doneTodos={doneTodos} tags={tags} onUpdate={onUpdate} onCreateTag={onCreateTag} />

      <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 px-5 py-2">
        {visibleKeys.map(dateKey => (
          <div key={dateKey || 'undated'}>
            <p className="text-[11px] font-semibold text-gray-300 tracking-wider pt-3">
              {dateKey ? formatRelativeDate(dateKey) : '날짜 없음'}
            </p>
            {groups[dateKey].map(todo => (
              <CompletedTodoItem key={todo.id} todo={todo} tags={tags} onUpdate={onUpdate} onCreateTag={onCreateTag} />
            ))}
          </div>
        ))}
        {!showAll && dateKeys.length > 3 && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full py-3 text-xs text-gray-400 font-medium hover:text-gray-500 transition-colors"
          >
            전체 보기 ({dateKeys.length}일)
          </button>
        )}
      </div>
    </div>
  )
}
