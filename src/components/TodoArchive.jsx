import { useState } from 'react'
import { formatRelativeDate } from '../lib/dates'

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
    emoji: todo.emoji,
    when: todo.when || '',
    deadline: todo.deadline || '',
    tag_ids: todo.tag_ids || [],
  })
  const todoTags = tags.filter(t => (todo.tag_ids || []).includes(t.id))

  const saveEdit = () => {
    if (draft.name.trim()) onUpdate(todo.id, {
      name: draft.name.trim(),
      emoji: draft.emoji,
      when: draft.when || null,
      deadline: draft.deadline || null,
      tag_ids: draft.tag_ids,
    })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100">
        <div className="flex gap-2 mb-3">
          <input type="text" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}
            className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" autoFocus />
          <input type="text" value={draft.emoji} onChange={e => setDraft({ ...draft, emoji: e.target.value })}
            className="w-14 bg-gray-50 rounded-xl px-2 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-300" />
        </div>
        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1 px-1">할 날짜</p>
            <input type="date" value={draft.when} onChange={e => setDraft({ ...draft, when: e.target.value })}
              className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1 px-1">기한</p>
            <input type="date" value={draft.deadline} onChange={e => setDraft({ ...draft, deadline: e.target.value })}
              className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
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
          <button onClick={() => setEditing(false)} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 bg-gray-50">취소</button>
          <button onClick={saveEdit} className="flex-1 py-2.5 rounded-xl text-sm text-white bg-emerald-400 font-medium">저장</button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-gray-50 flex items-center gap-3 opacity-60"
      onClick={() => setEditing(true)}>
      <div className="w-6 h-6 rounded-full bg-emerald-400 flex items-center justify-center flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className="text-lg">{todo.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-400 line-through">{todo.name}</p>
        {(todo.when || todo.deadline) && (
          <div className="flex gap-2 mt-0.5 flex-wrap items-center">
            {/* 완료된 항목엔 D-day·경고색 없이 날짜만 담백하게 */}
            {todo.when && <span className="text-xs text-blue-300">📅 {formatRelativeDate(todo.when)}</span>}
            {todo.deadline && <span className="text-xs text-gray-300">⏰ {formatRelativeDate(todo.deadline)}</span>}
          </div>
        )}
        {todoTags.length > 0 && (
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {todoTags.map(tag => <TagChip key={tag.id} tag={tag} />)}
          </div>
        )}
      </div>
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
          <div className="space-y-2">
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

function TagSection({ tag, todos, tags, onUpdate, onCreateTag }) {
  const [open, setOpen] = useState(false)
  const items = tag === null
    ? todos.filter(t => !t.tag_ids || t.tag_ids.length === 0)
    : todos.filter(t => (t.tag_ids || []).includes(tag.id))

  if (items.length === 0) return null

  const label = tag ? tag.name : '태그 없음'
  const color = tag ? TAG_COLORS[tag.color_index % TAG_COLORS.length] : { bg: 'bg-gray-100', text: 'text-gray-400' }

  return (
    <div className="mx-4">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between py-2.5 px-1">
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
          {items.map(todo => (
            <CompletedTodoItem key={todo.id} todo={todo} tags={tags} onUpdate={onUpdate} onCreateTag={onCreateTag} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function TodoArchive({ doneTodos, tags, onUpdate, onCreateTag }) {
  if (doneTodos.length === 0) return null

  return (
    <div className="mt-6">
      <div className="px-5 mb-3">
        <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">완료된 할 일</p>
      </div>

      <ArchiveCalendar doneTodos={doneTodos} tags={tags} onUpdate={onUpdate} onCreateTag={onCreateTag} />

      <div className="mt-4 space-y-1">
        {tags.map(tag => (
          <TagSection key={tag.id} tag={tag} todos={doneTodos} tags={tags} onUpdate={onUpdate} onCreateTag={onCreateTag} />
        ))}
        <TagSection tag={null} todos={doneTodos} tags={tags} onUpdate={onUpdate} onCreateTag={onCreateTag} />
      </div>
    </div>
  )
}
