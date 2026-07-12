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
import {
  getTodayKey,
  getNextDateKey,
  formatRelativeDate,
  formatUpcomingLabel,
  formatDday,
} from '../lib/dates'
import TodoArchive from './TodoArchive'

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

const WEEKDAY_LABELS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

function getTodoOrder(todo, index = 0) {
  return Number.isFinite(todo.order_index) ? todo.order_index : index
}

function TagChip({ tag, selected, onClick }) {
  const color = TAG_COLORS[tag.color_index % TAG_COLORS.length]
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all
        ${selected ? `${color.bg} ${color.text}` : 'bg-transparent text-gray-400 hover:text-gray-500'}`}
    >
      {tag.name}
    </button>
  )
}

function TagDots({ todo, tags }) {
  const todoTags = tags.filter(t => (todo.tag_ids || []).includes(t.id))
  if (todoTags.length === 0) return null
  return (
    <span className="flex gap-1 flex-shrink-0 items-center">
      {todoTags.map(tag => (
        <span
          key={tag.id}
          title={tag.name}
          className={`w-[7px] h-[7px] rounded-full ${TAG_COLORS[tag.color_index % TAG_COLORS.length].dot}`}
        />
      ))}
    </span>
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
    <div className="flex flex-wrap gap-1.5 items-center">
      {tags.map(tag => {
        const color = TAG_COLORS[tag.color_index % TAG_COLORS.length]
        const selected = selectedIds.includes(tag.id)
        return (
          <button
            key={tag.id}
            onClick={() => onToggle(tag.id)}
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all
              ${selected ? `${color.bg} ${color.text}` : 'bg-white border border-gray-200 text-gray-400'}`}
          >
            {tag.name}
          </button>
        )
      })}
      {adding ? (
        <span className="flex items-center gap-1">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleCreate(); if (e.key === 'Escape') setAdding(false) }}
            placeholder="태그명"
            className="w-20 bg-white border border-gray-200 rounded-full px-2.5 py-1 text-xs focus:outline-none focus:border-emerald-300"
          />
          <button onClick={handleCreate} className="text-xs text-emerald-500 font-medium">추가</button>
        </span>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="px-2 py-1 rounded-full text-xs text-gray-300 hover:text-gray-400 transition-all"
        >
          + 태그
        </button>
      )}
    </div>
  )
}

export default function TodoTab({ userId, onSummary }) {
  const [todos, setTodos] = useState([])
  const [tags, setTags] = useState([])
  const [filterTag, setFilterTag] = useState(null)
  const [showOverdue, setShowOverdue] = useState(false)
  const [showLater, setShowLater] = useState(false)
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

  // 헤더 인사말용 현황 보고 — 오늘까지(지난 포함) 남은 할 일, 오늘 완료 (태그 필터 무시)
  useEffect(() => {
    if (loading) return
    const tk = getTodayKey()
    onSummary?.({
      remaining: todos.filter(t => !t.done && t.when && t.when <= tk).length,
      doneToday: todos.filter(t => t.done && t.done_at === tk).length,
    })
  }, [todos, loading, onSummary])

  const createTag = async (name) => {
    const id = Date.now()
    const tag = { id, user_id: userId, name, color_index: tags.length }
    setTags(prev => [...prev, tag])
    const { error } = await supabase.from('todo_tags').insert(tag)
    if (error) console.error('createTag error:', error)
    return id
  }

  const addTodo = async ({ name, when, deadline, tag_ids }) => {
    const id = Date.now()
    const todo = {
      id, user_id: userId, name, emoji: '📌',
      done: false, done_at: null, when: when || null, deadline: deadline || null,
      order_index: todos.length,
      tag_ids,
    }
    setTodos(prev => [...prev, todo])

    const { error } = await supabase.from('todos').insert({
      id: todo.id, user_id: userId, name: todo.name, emoji: todo.emoji,
      done: false, done_at: null, when: todo.when, deadline: todo.deadline,
    })
    if (error) { console.error('addTodo error:', error); return }

    await supabase.from('todos')
      .update({ order_index: todo.order_index })
      .eq('id', id).eq('user_id', userId)

    if (tag_ids.length > 0) {
      const links = tag_ids.map(tagId => ({ todo_id: id, tag_id: tagId, user_id: userId }))
      const { error: le } = await supabase.from('todo_tag_links').insert(links)
      if (le) console.error('addTodo tag links error:', le)
    }
  }

  const toggleDone = async (id) => {
    const todo = todos.find(t => t.id === id)
    const newDone = !todo.done
    // done_at은 실제 완료일 — 통계에서 "이번 주 완료" 집계에 쓰인다 (아카이브 그룹핑은 when 기준)
    const newDoneAt = newDone ? getTodayKey() : null

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
  const todayKey = getTodayKey()
  const byOrder = (a, b) => getTodoOrder(a) - getTodoOrder(b) || (a.created_at || '').localeCompare(b.created_at || '')

  // Only show pending todos in main list
  const pending = todos.filter(t => !t.done)
  const done = todos.filter(t => t.done)

  const filtered = filterTag ? pending.filter(t => (t.tag_ids || []).includes(filterTag)) : pending
  const overdue = filtered.filter(t => t.when && t.when < todayKey).sort(byOrder)
  const todayTodos = filtered.filter(t => t.when === todayKey).sort(byOrder)
  const upcoming = filtered.filter(t => t.when && t.when > todayKey)
    .sort((a, b) => a.when.localeCompare(b.when) || byOrder(a, b))
  const later = filtered.filter(t => !t.when).sort(byOrder)
  const doneToday = done.filter(t => t.done_at === todayKey).length

  const moveOverdueToToday = async () => {
    const ids = overdue.map(t => t.id)
    setTodos(prev => prev.map(t => ids.includes(t.id) ? { ...t, when: todayKey } : t))
    const results = await Promise.all(ids.map(id =>
      supabase.from('todos').update({ when: todayKey }).eq('id', id).eq('user_id', userId)
    ))
    results.forEach(({ error }) => {
      if (error) console.error('moveOverdueToToday error:', error)
    })
  }

  const rowProps = { tags, onToggle: toggleDone, onDelete: deleteTodo, onUpdate: updateTodo, onCreateTag: createTag }

  return (
    <div className="pt-4 pb-8">
      <div className="px-4">
        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-5">
          {/* 태그 필터 */}
          {tags.length > 0 && (
            <div className="flex gap-1 flex-wrap mb-4 -ml-1">
              <button
                onClick={() => setFilterTag(null)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  filterTag === null ? 'bg-gray-800 text-white' : 'bg-transparent text-gray-400 hover:text-gray-500'
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

          {/* 오늘 헤더 */}
          <div className="flex items-baseline justify-between">
            <h3 className="text-xl font-bold text-gray-800">오늘</h3>
            <span className="text-xs text-gray-400">
              {now.getMonth() + 1}월 {now.getDate()}일 {WEEKDAY_LABELS[now.getDay()]}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1 mb-3">
            {doneToday > 0 && `${doneToday}개 완료 · `}
            {todayTodos.length > 0 ? `${todayTodos.length}개 남음` : '남은 할 일 없음'}
          </p>

          {/* 지난 할 일 배너 */}
          {overdue.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-2 bg-red-50 rounded-xl px-3 py-2.5">
                <button
                  onClick={() => setShowOverdue(v => !v)}
                  className="flex items-center gap-1.5 flex-1 text-left"
                >
                  <svg
                    className={`w-3.5 h-3.5 text-red-300 transition-transform ${showOverdue ? 'rotate-90' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-xs font-medium text-red-500">지난 할 일 {overdue.length}개</span>
                </button>
                <button
                  onClick={moveOverdueToToday}
                  className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
                >
                  오늘로 옮기기
                </button>
              </div>
              {showOverdue && (
                <div className="mt-1 px-1">
                  {overdue.map(todo => (
                    <TodoRow
                      key={todo.id}
                      todo={todo}
                      dateLabel={formatRelativeDate(todo.when, todayKey)}
                      dateLabelClass="text-red-300"
                      {...rowProps}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 오늘 */}
          {todayTodos.length === 0 ? (
            overdue.length === 0 && upcoming.length === 0 && later.length === 0 ? (
              <div className="text-center py-10 text-gray-300">
                <p className="text-4xl mb-3">🌿</p>
                <p className="text-sm font-medium">
                  {filterTag ? '이 태그의 할 일이 없어요' : '아래에서 첫 할 일을 추가해봐요'}
                </p>
              </div>
            ) : (
              <p className="py-3 text-xs text-gray-300">오늘 할 일이 없어요</p>
            )
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={({ active, over }) => reorderTodos(active.id, over?.id, todayTodos)}
            >
              <SortableContext items={todayTodos.map(todo => todo.id)} strategy={verticalListSortingStrategy}>
                <div>
                  {todayTodos.map(todo => (
                    <TodoRow key={todo.id} todo={todo} draggable {...rowProps} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* 예정 */}
          {upcoming.length > 0 && (
            <div className="mt-5">
              <p className="text-[11px] font-semibold text-gray-300 tracking-wider mb-0.5">예정</p>
              {upcoming.map(todo => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  dateLabel={formatUpcomingLabel(todo.when, todayKey)}
                  {...rowProps}
                />
              ))}
            </div>
          )}

          {/* 나중에 */}
          {later.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowLater(v => !v)}
                className="flex items-center gap-1.5 py-1 text-gray-400"
              >
                <svg
                  className={`w-3.5 h-3.5 text-gray-300 transition-transform ${showLater ? 'rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-[11px] font-semibold tracking-wider">나중에</span>
                <span className="text-[11px] text-gray-300">{later.length}</span>
              </button>
              {showLater && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={({ active, over }) => reorderTodos(active.id, over?.id, later)}
                >
                  <SortableContext items={later.map(todo => todo.id)} strategy={verticalListSortingStrategy}>
                    <div>
                      {later.map(todo => (
                        <TodoRow key={todo.id} todo={todo} draggable {...rowProps} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          )}

          <QuickAdd tags={tags} todayKey={todayKey} onAdd={addTodo} onCreateTag={createTag} />
        </div>
      </div>

      {/* 완료 아카이브 */}
      <TodoArchive doneTodos={done} tags={tags} onUpdate={updateTodo} onCreateTag={createTag} />
    </div>
  )
}

function QuickAdd({ tags, todayKey, onAdd, onCreateTag }) {
  const [name, setName] = useState('')
  const [dateMode, setDateMode] = useState('today')
  const [customDate, setCustomDate] = useState('')
  const [showDeadline, setShowDeadline] = useState(false)
  const [deadline, setDeadline] = useState('')
  const [tagIds, setTagIds] = useState([])

  const when = dateMode === 'today' ? todayKey
    : dateMode === 'tomorrow' ? getNextDateKey(todayKey)
    : dateMode === 'date' ? (customDate || null)
    : null

  const submit = () => {
    if (!name.trim()) return
    onAdd({ name: name.trim(), when, deadline: showDeadline ? deadline : '', tag_ids: tagIds })
    setName('')
  }

  const dateChips = [
    { key: 'today', label: '오늘' },
    { key: 'tomorrow', label: '내일' },
    { key: 'date', label: '날짜' },
    { key: 'later', label: '나중에' },
  ]

  return (
    <div className="mt-4 bg-gray-50 rounded-2xl px-3.5 py-3">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit() }}
          placeholder="할 일 입력 후 Enter"
          className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-gray-300"
        />
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2.5 items-center">
        {dateChips.map(chip => (
          <button
            key={chip.key}
            onClick={() => setDateMode(chip.key)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              dateMode === chip.key
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-white border border-gray-200 text-gray-400'
            }`}
          >
            {chip.label}
          </button>
        ))}
        {dateMode === 'date' && (
          <input
            type="date"
            value={customDate}
            onChange={e => setCustomDate(e.target.value)}
            className="bg-white border border-gray-200 rounded-full px-2.5 py-0.5 text-xs text-gray-500 focus:outline-none focus:border-emerald-300"
          />
        )}
        <span className="w-px h-4 bg-gray-200 mx-0.5" />
        <button
          onClick={() => setShowDeadline(v => !v)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
            showDeadline ? 'bg-amber-100 text-amber-600' : 'bg-white border border-gray-200 text-gray-400'
          }`}
        >
          기한
        </button>
        {showDeadline && (
          <input
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="bg-white border border-gray-200 rounded-full px-2.5 py-0.5 text-xs text-gray-500 focus:outline-none focus:border-amber-300"
          />
        )}
        <span className="w-px h-4 bg-gray-200 mx-0.5" />
        <TagSelector
          tags={tags}
          selectedIds={tagIds}
          onToggle={id => setTagIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])}
          onCreateTag={async (tagName) => {
            const id = await onCreateTag(tagName)
            setTagIds(prev => [...prev, id])
          }}
        />
      </div>
    </div>
  )
}

function TodoRow({ todo, tags, onToggle, onDelete, onUpdate, onCreateTag, draggable = false, dateLabel = null, dateLabelClass = 'text-gray-400' }) {
  const [editing, setEditing] = useState(false)
  const [checking, setChecking] = useState(false)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id, disabled: !draggable || editing })
  const today = getTodayKey()

  if (editing) {
    return (
      <TodoEditForm
        todo={todo}
        tags={tags}
        onCreateTag={onCreateTag}
        onDelete={onDelete}
        onSave={changes => { onUpdate(todo.id, changes); setEditing(false) }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  const handleCheck = () => {
    if (checking) return
    setChecking(true)
    // 체크 애니메이션을 보여준 뒤 목록에서 제거
    setTimeout(() => onToggle(todo.id), 350)
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`group flex items-center gap-2.5 py-3 border-b border-gray-100 ${
        isDragging ? 'bg-white rounded-xl shadow-lg z-10 border-transparent px-2' : ''
      }`}
    >
      {draggable && (
        <button
          type="button"
          className="touch-none cursor-grab active:cursor-grabbing text-gray-200 hover:text-gray-400 transition-colors -ml-1.5 flex-shrink-0"
          aria-label="할 일 순서 변경"
          {...attributes}
          {...listeners}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h.01M8 12h.01M8 17h.01M16 7h.01M16 12h.01M16 17h.01" />
          </svg>
        </button>
      )}
      <button
        onClick={handleCheck}
        aria-label="완료"
        className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          checking
            ? 'bg-emerald-400 border-emerald-400 check-pop'
            : 'border-gray-200 hover:border-emerald-400'
        }`}
      >
        {checking && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <button onClick={() => setEditing(true)} className="flex-1 min-w-0 text-left">
        <p className={`text-sm transition-colors ${checking ? 'text-gray-300 line-through' : 'text-gray-700'}`}>
          {todo.name}
        </p>
      </button>

      {dateLabel && <span className={`text-[11px] flex-shrink-0 ${dateLabelClass}`}>{dateLabel}</span>}
      {todo.deadline && (() => {
        const dday = formatDday(todo.deadline, today)
        return (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
            dday.urgent ? 'bg-red-50 text-red-400' : 'bg-gray-50 text-gray-400'
          }`}>
            {dday.label}
          </span>
        )
      })()}
      <TagDots todo={todo} tags={tags} />
    </div>
  )
}

function TodoEditForm({ todo, tags, onSave, onCancel, onDelete, onCreateTag }) {
  const [draft, setDraft] = useState({
    name: todo.name,
    when: todo.when || '', deadline: todo.deadline || '',
    tag_ids: todo.tag_ids || []
  })

  const save = () => {
    if (!draft.name.trim()) return
    onSave({
      name: draft.name.trim(),
      when: draft.when || null, deadline: draft.deadline || null,
      tag_ids: draft.tag_ids,
    })
  }

  return (
    <div className="bg-gray-50 rounded-2xl p-4 my-2">
      <input
        type="text"
        value={draft.name}
        onChange={e => setDraft({ ...draft, name: e.target.value })}
        onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) save(); if (e.key === 'Escape') onCancel() }}
        className="w-full bg-white rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        autoFocus
      />
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <p className="text-xs text-gray-400 mb-1 px-1">할 날짜</p>
          <input
            type="date"
            value={draft.when}
            onChange={e => setDraft({ ...draft, when: e.target.value })}
            className="w-full bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-400 mb-1 px-1">기한</p>
          <input
            type="date"
            value={draft.deadline}
            onChange={e => setDraft({ ...draft, deadline: e.target.value })}
            className="w-full bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
      </div>
      <div className="mb-3">
        <p className="text-xs text-gray-400 mb-1.5 px-1">태그</p>
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
        <button
          onClick={() => onDelete(todo.id)}
          className="px-4 py-2.5 rounded-xl text-sm text-red-400 bg-white"
        >
          삭제
        </button>
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 bg-white">취소</button>
        <button onClick={save} className="flex-1 py-2.5 rounded-xl text-sm text-white bg-emerald-400 font-medium">저장</button>
      </div>
    </div>
  )
}
