import { useState, useEffect } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../lib/supabase'
import { formatRelativeDate, formatDday } from '../lib/dates'
import TodoArchive from './TodoArchive'

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

const WEEKDAY_LABELS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getTodayKey() {
  return toDateKey(new Date())
}

function getTodoOrder(todo, index = 0) {
  return Number.isFinite(todo.order_index) ? todo.order_index : index
}

function TagChip({ tag, selected, onClick, onDelete }) {
  const color = TAG_COLORS[tag.color_index % TAG_COLORS.length]
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all
        ${selected ? `${color.bg} ${color.text} ring-2 ring-offset-1 ring-current` : `${color.bg} ${color.text} opacity-70`}`}
    >
      {tag.name}
      {onDelete && (
        <span onClick={e => { e.stopPropagation(); onDelete(tag.id) }} className="ml-0.5 opacity-60 hover:opacity-100">×</span>
      )}
    </button>
  )
}

function TagSelector({ tags, selectedIds, onToggle, onCreateTag }) {
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
        {tags.map(tag => (
          <TagChip
            key={tag.id}
            tag={tag}
            selected={selectedIds.includes(tag.id)}
            onClick={() => onToggle(tag.id)}
          />
        ))}
        {adding ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setAdding(false) }}
              placeholder="태그명"
              className="w-20 bg-gray-50 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
            <button onClick={handleCreate} className="text-xs text-emerald-500 font-medium">추가</button>
            <button onClick={() => setAdding(false)} className="text-xs text-gray-400">취소</button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-400 hover:bg-gray-200 transition-all"
          >
            + 새 태그
          </button>
        )}
      </div>
    </div>
  )
}

export default function TodoTab({ userId }) {
  const [todos, setTodos] = useState([])
  const [tags, setTags] = useState([])
  const [filterTag, setFilterTag] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newTodo, setNewTodo] = useState({ name: '', deadline: '', when: '', emoji: '📌', tag_ids: [] })
  const [loading, setLoading] = useState(true)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  // Load todos, tags, and tag links
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const [{ data: todosData }, { data: tagsData }, { data: linksData }] = await Promise.all([
        supabase.from('todos').select('*').eq('user_id', userId).order('created_at'),
        supabase.from('todo_tags').select('*').eq('user_id', userId),
        supabase.from('todo_tag_links').select('todo_id, tag_id').eq('user_id', userId),
      ])
      if (cancelled) return

      // Attach tag_ids to each todo
      const linkMap = {}
      for (const { todo_id, tag_id } of (linksData || [])) {
        if (!linkMap[todo_id]) linkMap[todo_id] = []
        linkMap[todo_id].push(tag_id)
      }
      const todosWithTags = (todosData || []).map((t, index) => ({
        ...t,
        order_index: getTodoOrder(t, index),
        tag_ids: linkMap[t.id] || [],
      }))

      setTodos(todosWithTags)
      setTags(tagsData || [])
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [userId])

  const createTag = async (name) => {
    const id = Date.now()
    const tag = { id, user_id: userId, name, color_index: tags.length }
    setTags(prev => [...prev, tag])
    const { error } = await supabase.from('todo_tags').insert(tag)
    if (error) console.error('createTag error:', error)
    return id
  }

  const addTodo = async () => {
    if (!newTodo.name.trim()) return
    const id = Date.now()
    const todo = {
      id, user_id: userId, name: newTodo.name.trim(), emoji: newTodo.emoji || '📌',
      done: false, done_at: null, when: newTodo.when || null, deadline: newTodo.deadline || null,
      order_index: todos.length,
      tag_ids: newTodo.tag_ids,
    }
    setTodos(prev => [...prev, todo])
    setNewTodo({ name: '', deadline: '', when: '', emoji: '📌', tag_ids: [] })
    setShowAdd(false)

    const { error } = await supabase.from('todos').insert({
      id: todo.id, user_id: userId, name: todo.name, emoji: todo.emoji,
      done: false, done_at: null, when: todo.when, deadline: todo.deadline,
    })
    if (error) { console.error('addTodo error:', error); return }

    await supabase.from('todos')
      .update({ order_index: todo.order_index })
      .eq('id', id).eq('user_id', userId)

    if (todo.tag_ids.length > 0) {
      const links = todo.tag_ids.map(tagId => ({ todo_id: id, tag_id: tagId, user_id: userId }))
      const { error: le } = await supabase.from('todo_tag_links').insert(links)
      if (le) console.error('addTodo tag links error:', le)
    }
  }

  const toggleDone = async (id) => {
    const todo = todos.find(t => t.id === id)
    const newDone = !todo.done
    const newDoneAt = newDone ? (todo.when || null) : null

    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: newDone, done_at: newDoneAt } : t))

    const { error } = await supabase.from('todos')
      .update({ done: newDone, done_at: newDoneAt })
      .eq('id', id).eq('user_id', userId)
    if (error) console.error('toggleDone error:', error)
  }

  const updateTodo = async (id, changes) => {
    const { tag_ids, ...dbChanges } = changes
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t))

    if (Object.keys(dbChanges).length > 0) {
      const { error } = await supabase.from('todos').update(dbChanges).eq('id', id).eq('user_id', userId)
      if (error) console.error('updateTodo error:', error)
    }

    if (tag_ids !== undefined) {
      // Replace all tag links for this todo
      await supabase.from('todo_tag_links').delete().eq('todo_id', id).eq('user_id', userId)
      if (tag_ids.length > 0) {
        const links = tag_ids.map(tagId => ({ todo_id: id, tag_id: tagId, user_id: userId }))
        const { error } = await supabase.from('todo_tag_links').insert(links)
        if (error) console.error('updateTodo tag links error:', error)
      }
    }
  }

  const deleteTodo = async (id) => {
    setTodos(prev => prev.filter(t => t.id !== id))
    const { error } = await supabase.from('todos').delete().eq('id', id).eq('user_id', userId)
    if (error) console.error('deleteTodo error:', error)
  }

  const reorderTodos = async (activeId, overId, items) => {
    if (!overId || activeId === overId) return

    const oldIndex = items.findIndex(t => t.id === activeId)
    const newIndex = items.findIndex(t => t.id === overId)
    if (oldIndex < 0 || newIndex < 0) return

    const reordered = arrayMove(items, oldIndex, newIndex).map((todo, index) => ({
      ...todo,
      order_index: index,
    }))

    setTodos(prev => prev.map(todo => reordered.find(t => t.id === todo.id) || todo))

    const updates = reordered.map(todo =>
      supabase.from('todos')
        .update({ order_index: todo.order_index })
        .eq('id', todo.id)
        .eq('user_id', userId)
    )
    const results = await Promise.all(updates)
    results.forEach(({ error }) => {
      if (error) console.error('reorderTodos error:', error)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const now = new Date()
  const todayKey = toDateKey(now)
  const tomorrowKey = toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
  const daysUntilSunday = (7 - now.getDay()) % 7
  const currentWeekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday)
  const currentWeekEndKey = toDateKey(currentWeekEnd)
  const nextWeekEndKey = toDateKey(new Date(currentWeekEnd.getFullYear(), currentWeekEnd.getMonth(), currentWeekEnd.getDate() + 7))
  const byOrder = (a, b) => getTodoOrder(a) - getTodoOrder(b) || (a.created_at || '').localeCompare(b.created_at || '')

  // Only show pending todos in main list
  const pending = todos.filter(t => !t.done)
  const done = todos.filter(t => t.done)

  const filtered = filterTag ? pending.filter(t => (t.tag_ids || []).includes(filterTag)) : pending
  const pastTodos = filtered.filter(t => t.when && t.when < todayKey).sort(byOrder)
  const thisWeekSections = Array.from({ length: daysUntilSunday + 1 }, (_, offset) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
    const dateKey = toDateKey(date)
    const suffix = dateKey === todayKey ? ' (오늘)' : dateKey === tomorrowKey ? ' (내일)' : ''
    return {
      label: `${WEEKDAY_LABELS[date.getDay()]}${suffix}`,
      items: filtered.filter(t => t.when === dateKey).sort(byOrder),
      color: dateKey === todayKey ? 'text-emerald-400' : dateKey === tomorrowKey ? 'text-blue-400' : 'text-violet-400',
    }
  })
  const nextWeekTodos = filtered.filter(t => t.when > currentWeekEndKey && t.when <= nextWeekEndKey).sort(byOrder)
  const laterTodos = filtered.filter(t => !t.when || t.when > nextWeekEndKey).sort(byOrder)
  const todoSections = [
    { label: '지난', items: pastTodos, color: 'text-red-400' },
    ...thisWeekSections,
    { label: '다음 주', items: nextWeekTodos, color: 'text-indigo-400' },
    { label: '나중에', items: laterTodos, color: 'text-gray-400' },
  ]

  return (
    <div className="pt-4 pb-8">
      {/* 태그 필터 바 */}
      {tags.length > 0 && (
        <div className="px-4 mb-4 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterTag(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filterTag === null ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-400'
            }`}
          >
            전체
          </button>
          {tags.map(tag => (
            <TagChip
              key={tag.id}
              tag={tag}
              selected={filterTag === tag.id}
              onClick={() => setFilterTag(filterTag === tag.id ? null : tag.id)}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 && !showAdd && done.length === 0 && (
        <div className="text-center py-16 text-gray-300">
          <p className="text-5xl mb-4">✅</p>
          <p className="text-sm font-medium">
            {filterTag ? '이 태그의 할 일이 없어요!' : '할 일을 추가해봐요!'}
          </p>
        </div>
      )}

      {todoSections.map(({ label, items, color }) => items.length > 0 && (
        <div key={label} className="px-4 mb-5">
          <p className={`text-xs font-semibold mb-2 px-1 flex items-center gap-1.5 ${color}`}>
            {label}
            <span className="text-[10px] font-bold bg-white rounded-full px-1.5 py-px border border-gray-100 text-gray-400">{items.length}</span>
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={({ active, over }) => reorderTodos(active.id, over?.id, items)}
          >
            <SortableContext items={items.map(todo => todo.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {items.map(todo => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    tags={tags}
                    onToggle={toggleDone}
                    onDelete={deleteTodo}
                    onUpdate={updateTodo}
                    onCreateTag={createTag}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      ))}

      <div className="px-4 mt-2">
        {showAdd ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="할 일"
                value={newTodo.name}
                onChange={e => setNewTodo({ ...newTodo, name: e.target.value })}
                className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                autoFocus
              />
              <input
                type="text"
                placeholder="📌"
                value={newTodo.emoji}
                onChange={e => setNewTodo({ ...newTodo, emoji: e.target.value })}
                className="w-14 bg-gray-50 rounded-xl px-2 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
            <div className="space-y-3 mb-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1 px-1">할 날짜</p>
                  <input
                    type="date"
                    value={newTodo.when}
                    onChange={e => setNewTodo({ ...newTodo, when: e.target.value })}
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1 px-1">기한</p>
                  <input
                    type="date"
                    value={newTodo.deadline}
                    onChange={e => setNewTodo({ ...newTodo, deadline: e.target.value })}
                    className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
              </div>
              <TagSelector
                tags={tags}
                selectedIds={newTodo.tag_ids}
                onToggle={id => setNewTodo(prev => ({
                  ...prev,
                  tag_ids: prev.tag_ids.includes(id) ? prev.tag_ids.filter(t => t !== id) : [...prev.tag_ids, id]
                }))}
                onCreateTag={async (name) => {
                  const id = await createTag(name)
                  setNewTodo(prev => ({ ...prev, tag_ids: [...prev.tag_ids, id] }))
                }}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 bg-gray-50">취소</button>
              <button onClick={addTodo} className="flex-1 py-2.5 rounded-xl text-sm text-white bg-emerald-400 font-medium">추가</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full py-3.5 rounded-2xl text-sm text-emerald-500 border-2 border-dashed border-emerald-200 font-medium bg-emerald-50/50"
          >
            + 할 일 추가
          </button>
        )}
      </div>

      {/* 완료 아카이브 */}
      <TodoArchive doneTodos={done} tags={tags} onUpdate={updateTodo} onCreateTag={createTag} />
    </div>
  )
}

function TodoItem({ todo, tags, onToggle, onDelete, onUpdate, onCreateTag }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    name: todo.name, emoji: todo.emoji,
    when: todo.when || '', deadline: todo.deadline || '',
    tag_ids: todo.tag_ids || []
  })
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id, disabled: editing })
  const today = getTodayKey()
  const isOverdue = todo.deadline && !todo.done && todo.deadline < today

  const saveEdit = () => {
    if (draft.name.trim()) onUpdate(todo.id, {
      name: draft.name.trim(), emoji: draft.emoji,
      when: draft.when || null, deadline: draft.deadline || null,
      tag_ids: draft.tag_ids,
    })
    setEditing(false)
  }

  const todoTags = tags.filter(t => (todo.tag_ids || []).includes(t.id))

  if (editing) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={draft.name}
            onChange={e => setDraft({ ...draft, name: e.target.value })}
            className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            autoFocus
          />
          <input
            type="text"
            value={draft.emoji}
            onChange={e => setDraft({ ...draft, emoji: e.target.value })}
            className="w-14 bg-gray-50 rounded-xl px-2 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
        <div className="space-y-3 mb-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1 px-1">할 날짜</p>
              <input
                type="date"
                value={draft.when}
                onChange={e => setDraft({ ...draft, when: e.target.value })}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1 px-1">기한</p>
              <input
                type="date"
                value={draft.deadline}
                onChange={e => setDraft({ ...draft, deadline: e.target.value })}
                className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
          </div>
          <TagSelector
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
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`bg-white rounded-2xl px-3 py-3.5 shadow-sm border flex items-center gap-2 transition-shadow ${
        isDragging ? 'border-emerald-200 shadow-lg z-10 opacity-95' : 'border-gray-50'
      }`}
    >
      <button
        type="button"
        className="touch-none cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors p-1"
        aria-label="할 일 순서 변경"
        {...attributes}
        {...listeners}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h.01M8 12h.01M8 17h.01M16 7h.01M16 12h.01M16 17h.01" />
        </svg>
      </button>
      <button
        onClick={() => onToggle(todo.id)}
        className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all border-gray-200"
      >
      </button>

      <span className="text-lg">{todo.emoji}</span>

      <div className="flex-1 min-w-0" onClick={() => setEditing(true)}>
        <p className="text-sm font-medium text-gray-800">{todo.name}</p>
        <div className="flex gap-2 mt-0.5 flex-wrap items-center">
          {todo.when && <span className="text-xs text-blue-400">📅 {formatRelativeDate(todo.when, today)}</span>}
          {todo.deadline && (() => {
            const dday = formatDday(todo.deadline, today)
            return (
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                dday.urgent ? 'bg-red-50 text-red-400' : 'bg-gray-50 text-gray-400'
              }`}>
                {isOverdue ? '⚠️ ' : '⏰ '}{dday.label}
              </span>
            )
          })()}
          {todoTags.map(tag => (
            <TagChip key={tag.id} tag={tag} selected={false} onClick={() => {}} />
          ))}
        </div>
      </div>

      <button onClick={() => onDelete(todo.id)} className="text-gray-200 hover:text-red-300 transition-colors p-1">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
