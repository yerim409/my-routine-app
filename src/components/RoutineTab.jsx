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
import RoutineCalendar from './RoutineCalendar'

const DEFAULT_ROUTINES = [
  { id: 1, name: '영양제', emoji: '💊' },
  { id: 2, name: '일본어 공부', emoji: '🇯🇵' },
  { id: 3, name: '뉴스레터', emoji: '📰' },
  { id: 4, name: '국시 공부', emoji: '📖' },
  { id: 5, name: '운동', emoji: '🏃' },
  { id: 6, name: '일기', emoji: '✏️' },
  { id: 9, name: '영어 회화', emoji: '🗣️' },
  { id: 7, name: '독서', emoji: '📚' },
  { id: 8, name: '가계부', emoji: '💰' },
]

function getTodayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}


function SortableRoutineItem({ routine, checks, streaks, editMode, onToggle, onDelete, onSelect, onUpdate }) {
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
            {editMode && <p className="text-xs text-gray-300 mt-0.5">탭해서 수정</p>}
          </div>

          {!editMode && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <span className={streaks[routine.id] > 0 ? 'text-base' : 'text-base opacity-20'}>🔥</span>
              <span className={`text-xs font-semibold ${streaks[routine.id] > 0 ? 'text-orange-400' : 'text-gray-300'}`}>
                {streaks[routine.id] || 0}
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

export default function RoutineTab({ selectedDate }) {
  const dateKey = selectedDate || getTodayKey()

  const [routines, setRoutines] = useState(() => {
    const version = localStorage.getItem('routines_version')
    if (version !== '6') {
      localStorage.removeItem('routines')
      localStorage.removeItem('streaks')
      // streak_date 키들 초기화
      Object.keys(localStorage).filter(k => k.startsWith('streak_date_')).forEach(k => localStorage.removeItem(k))
      localStorage.setItem('routines_version', '6')
    }
    const saved = localStorage.getItem('routines')
    const parsed = saved ? JSON.parse(saved) : []
    return parsed.length > 0 ? parsed : DEFAULT_ROUTINES
  })

  const [checks, setChecks] = useState(() => {
    const saved = localStorage.getItem(`checks_${dateKey}`)
    return saved ? JSON.parse(saved) : {}
  })

  useEffect(() => {
    const saved = localStorage.getItem(`checks_${dateKey}`)
    setChecks(saved ? JSON.parse(saved) : {})
  }, [dateKey])

  const [streaks, setStreaks] = useState(() => {
    const saved = localStorage.getItem('streaks')
    return saved ? JSON.parse(saved) : {}
  })

  const [showAdd, setShowAdd] = useState(false)
  const [newRoutine, setNewRoutine] = useState({ name: '', emoji: '✨' })
  const [selectedRoutine, setSelectedRoutine] = useState(null)
  const [editMode, setEditMode] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  useEffect(() => { localStorage.setItem('routines', JSON.stringify(routines)) }, [routines])
  useEffect(() => { localStorage.setItem(`checks_${dateKey}`, JSON.stringify(checks)) }, [checks])

  const toggleCheck = (id) => {
    const isChecking = !checks[id]
    setChecks(prev => ({ ...prev, [id]: isChecking }))

    // 오늘 날짜에서 처음 체크할 때만 스트릭 증가
    const streakDateKey = `streak_date_${id}`
    const lastStreakDate = localStorage.getItem(streakDateKey)
    if (isChecking && lastStreakDate !== dateKey) {
      localStorage.setItem(streakDateKey, dateKey)
      setStreaks(prev => {
        const updated = { ...prev, [id]: (prev[id] || 0) + 1 }
        localStorage.setItem('streaks', JSON.stringify(updated))
        return updated
      })
    }
  }

  const updateRoutine = (id, changes) => {
    setRoutines(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r))
  }

  const addRoutine = () => {
    if (!newRoutine.name.trim()) return
    setRoutines(prev => [...prev, { ...newRoutine, id: Date.now() }])
    setNewRoutine({ name: '', emoji: '✨' })
    setShowAdd(false)
  }

  const deleteRoutine = (id) => setRoutines(prev => prev.filter(r => r.id !== id))

  const handleDragEnd = ({ active, over }) => {
    if (active.id !== over?.id) {
      setRoutines(prev => arrayMove(prev, prev.findIndex(r => r.id === active.id), prev.findIndex(r => r.id === over.id)))
    }
  }

  const doneCount = routines.filter(r => checks[r.id]).length
  const total = routines.length
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100)

  return (
    <div className="pt-4 pb-8">
      {selectedRoutine && <RoutineCalendar routine={selectedRoutine} onClose={() => setSelectedRoutine(null)} />}

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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={routines.map(r => r.id)} strategy={verticalListSortingStrategy}>
            {routines.map(routine => (
              <SortableRoutineItem
                key={routine.id}
                routine={routine}
                checks={checks}
                streaks={streaks}
                editMode={editMode}
                onToggle={toggleCheck}
                onDelete={deleteRoutine}
                onSelect={setSelectedRoutine}
                onUpdate={updateRoutine}
              />
            ))}
          </SortableContext>
        </DndContext>
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
