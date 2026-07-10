import { useState, useEffect, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../lib/supabase'
import RoutineCalendar from './RoutineCalendar'
import { getDateKey, getTodayKey, getPrevDateKey, getWeekKey, getPrevWeekKey, countWeekChecks, calculateWeeklyStreak } from '../lib/dates'

function calculateStreak(routineId, allChecks, dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const startDate = new Date(y, m - 1, d)
  let streak = 0
  let lastCheckedDate = null

  for (let i = 0; i < 365; i++) {
    const cur = new Date(startDate)
    cur.setDate(startDate.getDate() - i)
    const ds = getDateKey(cur)
    const dayChecks = allChecks[ds] || {}

    if (dayChecks[routineId]) {
      if (!lastCheckedDate) lastCheckedDate = ds
      streak++
    } else if (i === 0) {
      continue
    } else {
      break
    }
  }

  return { streak, lastCheckedDate }
}

function SortableRoutineItem({ routine, checks, allChecks, dateKey, editMode, onToggle, onDelete, onSelect, onUpdate }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: routine.id })
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(routine.name)
  const [editEmoji, setEditEmoji] = useState(routine.emoji)
  const inputRef = useRef(null)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const saveEdit = () => {
    if (editName.trim()) {
      onUpdate(routine.id, { name: editName.trim(), emoji: editEmoji })
    }
    setEditing(false)
  }

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  const isWeekly = !!routine.weekly_target
  const weekKey = getWeekKey(dateKey)
  const weekCount = isWeekly ? countWeekChecks(routine.id, allChecks, weekKey) : 0

  let streak, isStreakActive
  if (isWeekly) {
    const { streak: s, lastAchievedWeek } = calculateWeeklyStreak(routine.id, routine.weekly_target, allChecks, dateKey)
    streak = s
    isStreakActive = streak > 0 && (lastAchievedWeek === weekKey || lastAchievedWeek === getPrevWeekKey(weekKey))
  } else {
    const { streak: s, lastCheckedDate } = calculateStreak(routine.id, allChecks, dateKey)
    streak = s
    const prevDateKey = getPrevDateKey(dateKey)
    isStreakActive = streak > 0 && (lastCheckedDate === dateKey || lastCheckedDate === prevDateKey)
  }

  return (
    <div ref={setNodeRef} style={style} className={`bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-gray-50 flex items-center gap-3 ${checks[routine.id] && !editMode ? 'opacity-50' : ''}`}>
      {editMode ? (
        <div {...attributes} {...listeners} className="text-gray-300 cursor-grab active:cursor-grabbing p-1 touch-none">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
      ) : (
        <button
          onClick={() => onToggle(routine.id)}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${checks[routine.id] ? 'bg-emerald-400 border-emerald-400' : 'border-gray-200'}`}
        >
          {checks[routine.id] && (
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      )}

      {editing ? (
        <>
          <input
            type="text"
            value={editEmoji}
            onChange={e => setEditEmoji(e.target.value)}
            className="w-10 text-center text-lg bg-gray-50 rounded-lg p-1 focus:outline-none"
          />
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={e => e.key === 'Enter' && saveEdit()}
            className="flex-1 text-sm font-medium bg-gray-50 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </>
      ) : (
        <>
          <span className="text-lg">{routine.emoji}</span>
          <div
            className="flex-1"
            onClick={() => editMode ? setEditing(true) : onSelect(routine)}
          >
            <p className={`text-sm font-medium text-gray-800 ${checks[routine.id] && !editMode ? 'line-through text-gray-400' : ''}`}>
              {routine.name}
            </p>
            {isWeekly && !editMode && (
              <p className={`text-xs mt-0.5 font-semibold ${weekCount >= routine.weekly_target ? 'text-emerald-500' : 'text-gray-400'}`}>
                이번 주 {weekCount}/{routine.weekly_target}
              </p>
            )}
            {editMode && <p className="text-xs text-gray-300 mt-0.5">탭해서 수정</p>}
          </div>

          {!editMode && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <span className={isStreakActive ? 'text-base' : 'text-base opacity-30'}>🔥</span>
              <span className={`text-xs font-semibold ${isStreakActive ? 'text-orange-400' : 'text-gray-300'}`}>
                {streak}{isWeekly ? '주' : ''}
              </span>
            </div>
          )}
        </>
      )}

      {editMode && !editing && (
        <button onClick={() => onDelete(routine.id)} className="text-gray-300 hover:text-red-400 transition-colors p-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

export default function RoutineTab({ selectedDate, userId }) {
  const dateKey = selectedDate || getTodayKey()

  const [routines, setRoutines] = useState([])
  const [checks, setChecks] = useState({})
  const [allChecks, setAllChecks] = useState({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newRoutine, setNewRoutine] = useState({ name: '', emoji: '✨' })
  const [selectedRoutine, setSelectedRoutine] = useState(null)
  const [editMode, setEditMode] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  // Initial data load
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function load() {
      setLoading(true)

      const [{ data: routinesData }, { data: checksData }] = await Promise.all([
        supabase.from('routines').select('*').eq('user_id', userId).order('sort_order'),
        supabase.from('routine_checks').select('routine_id, date').eq('user_id', userId),
      ])

      if (cancelled) return

      setRoutines(routinesData || [])

      // Build allChecks map: { [date]: { [routineId]: true } }
      const map = {}
      for (const { routine_id, date } of (checksData || [])) {
        if (!map[date]) map[date] = {}
        map[date][routine_id] = true
      }
      setAllChecks(map)
      setChecks(map[dateKey] || {})
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [userId])

  // Update checks when dateKey changes
  useEffect(() => {
    setChecks(allChecks[dateKey] || {})
  }, [dateKey, allChecks])

  const toggleCheck = async (id) => {
    const isChecking = !checks[id]

    // Optimistic update
    const newDayChecks = { ...checks, [id]: isChecking }
    if (!isChecking) delete newDayChecks[id]
    setChecks(newDayChecks)
    setAllChecks(prev => ({ ...prev, [dateKey]: newDayChecks }))

    // Persist to Supabase
    if (isChecking) {
      const { error } = await supabase.from('routine_checks').upsert({ user_id: userId, routine_id: id, date: dateKey })
      if (error) console.error('toggleCheck insert error:', error)
    } else {
      const { error } = await supabase.from('routine_checks')
        .delete()
        .eq('user_id', userId)
        .eq('routine_id', id)
        .eq('date', dateKey)
      if (error) console.error('toggleCheck delete error:', error)
    }
  }

  const addRoutine = async () => {
    if (!newRoutine.name.trim()) return
    const id = Date.now()
    const routine = { id, user_id: userId, name: newRoutine.name.trim(), emoji: newRoutine.emoji, sort_order: routines.length }

    setRoutines(prev => [...prev, routine])
    setNewRoutine({ name: '', emoji: '✨' })
    setShowAdd(false)

    const { error } = await supabase.from('routines').insert(routine)
    if (error) console.error('addRoutine error:', error)
  }

  const deleteRoutine = async (id) => {
    setRoutines(prev => prev.filter(r => r.id !== id))
    const { error } = await supabase.from('routines').delete().eq('id', id).eq('user_id', userId)
    if (error) console.error('deleteRoutine error:', error)
  }

  const updateRoutine = async (id, changes) => {
    setRoutines(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r))
    const { error } = await supabase.from('routines').update(changes).eq('id', id).eq('user_id', userId)
    if (error) console.error('updateRoutine error:', error)
  }

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIdx = routines.findIndex(r => r.id === active.id)
    const newIdx = routines.findIndex(r => r.id === over.id)
    const reordered = arrayMove(routines, oldIdx, newIdx)
    setRoutines(reordered)

    // Update sort_order for all affected items
    const updates = reordered.map((r, i) => ({ id: r.id, user_id: userId, name: r.name, emoji: r.emoji, sort_order: i }))
    const { error } = await supabase.from('routines').upsert(updates)
    if (error) console.error('handleDragEnd error:', error)
  }

  const doneCount = routines.filter(r => checks[r.id]).length
  const total = routines.length
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="pt-4 pb-8">
      {selectedRoutine && (
        <RoutineCalendar
          routine={selectedRoutine}
          allChecks={allChecks}
          onClose={() => setSelectedRoutine(null)}
        />
      )}

      {/* 달성률 카드 */}
      <div className="mx-4 mb-5 bg-white rounded-3xl p-5 shadow-sm border border-gray-50">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-xs text-gray-400 font-medium">오늘 달성률</p>
            <p className="text-3xl font-bold text-gray-900 mt-0.5">{percent}<span className="text-lg text-gray-400">%</span></p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-400">{doneCount}/{total}</p>
            {percent === 100 && <span className="text-sm">🎉</span>}
            <button
              onClick={() => setEditMode(!editMode)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${editMode ? 'bg-emerald-400 text-white' : 'bg-gray-100 text-gray-400'}`}
            >
              {editMode ? '완료' : '편집'}
            </button>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div className="bg-emerald-400 h-2.5 rounded-full transition-all duration-700" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {/* 루틴 목록 */}
      <div className="px-4 space-y-2 mb-4">
        {routines.length === 0 && !showAdd ? (
          <div className="text-center py-16 text-gray-300">
            <p className="text-5xl mb-4">🌱</p>
            <p className="text-sm font-medium">아직 루틴이 없어요</p>
            <p className="text-xs mt-1">아래 버튼으로 첫 루틴을 추가해보세요</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={routines.map(r => r.id)} strategy={verticalListSortingStrategy}>
              {routines.map(routine => (
                <SortableRoutineItem
                  key={routine.id}
                  routine={routine}
                  checks={checks}
                  allChecks={allChecks}
                  dateKey={dateKey}
                  editMode={editMode}
                  onToggle={toggleCheck}
                  onDelete={deleteRoutine}
                  onSelect={setSelectedRoutine}
                  onUpdate={updateRoutine}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* 루틴 추가 */}
      <div className="px-4 mt-2">
        {showAdd ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="🌟"
                value={newRoutine.emoji}
                onChange={e => setNewRoutine({ ...newRoutine, emoji: e.target.value })}
                className="w-14 bg-gray-50 rounded-xl px-2 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
              <input
                type="text"
                placeholder="루틴 이름"
                value={newRoutine.name}
                onChange={e => setNewRoutine({ ...newRoutine, name: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && addRoutine()}
                className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 bg-gray-50">취소</button>
              <button onClick={addRoutine} className="flex-1 py-2.5 rounded-xl text-sm text-white bg-emerald-400 font-medium">추가</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full py-3.5 rounded-2xl text-sm text-emerald-500 border-2 border-dashed border-emerald-200 font-medium bg-emerald-50/50"
          >
            + 루틴 추가
          </button>
        )}
      </div>
    </div>
  )
}
