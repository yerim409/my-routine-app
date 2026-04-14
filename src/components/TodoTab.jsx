import { useState, useEffect } from 'react'

const toDateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

export default function TodoTab() {
  const [todos, setTodos] = useState(() => {
    const saved = localStorage.getItem('todos')
    return saved ? JSON.parse(saved) : []
  })

  const [showAdd, setShowAdd] = useState(false)
  const [newTodo, setNewTodo] = useState({ name: '', deadline: '', when: '', emoji: '📌' })

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos))
  }, [todos])

  const addTodo = () => {
    if (!newTodo.name.trim()) return
    setTodos([...todos, { ...newTodo, id: Date.now(), done: false }])
    setNewTodo({ name: '', deadline: '', when: '', emoji: '📌' })
    setShowAdd(false)
  }

  const toggleDone = (id) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const updateTodo = (id, changes) => {
    setTodos(todos.map(t => t.id === id ? { ...t, ...changes } : t))
  }

  const deleteTodo = (id) => {
    setTodos(todos.filter(t => t.id !== id))
  }

  const now = new Date()
  const todayKey = toDateKey(now)
  const tomorrowKey = toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
  const weekEndKey = toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7))

  const byDate = (a, b) => (a.when || '9999').localeCompare(b.when || '9999')

  const remaining = todos.filter(t => !t.done).sort(byDate)
  const todayTodos = remaining.filter(t => t.when === todayKey)
  const tomorrowTodos = remaining.filter(t => t.when === tomorrowKey)
  const weekTodos = remaining.filter(t => t.when > tomorrowKey && t.when <= weekEndKey)
  const laterTodos = remaining.filter(t => !t.when || t.when > weekEndKey)
  const done = todos.filter(t => t.done).sort(byDate)

  return (
    <div className="pt-4 pb-8">
      {todos.length === 0 && !showAdd && (
        <div className="text-center py-16 text-gray-300">
          <p className="text-5xl mb-4">✅</p>
          <p className="text-sm font-medium">할 일을 추가해봐요!</p>
        </div>
      )}

      {[
        { label: '오늘', items: todayTodos, color: 'text-emerald-400' },
        { label: '내일', items: tomorrowTodos, color: 'text-blue-400' },
        { label: '이번 주', items: weekTodos, color: 'text-violet-400' },
        { label: '나중에', items: laterTodos, color: 'text-gray-400' },
        { label: '완료', items: done, color: 'text-gray-300' },
      ].map(({ label, items, color }) => items.length > 0 && (
        <div key={label} className="px-4 mb-5">
          <p className={`text-xs font-semibold mb-2 px-1 ${color}`}>{label} {items.length}</p>
          <div className="space-y-2">
            {items.map(todo => (
              <TodoItem key={todo.id} todo={todo} onToggle={toggleDone} onDelete={deleteTodo} onUpdate={updateTodo} />
            ))}
          </div>
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
            <div className="space-y-2 mb-3">
              <div>
                <p className="text-xs text-gray-400 mb-1 px-1">할 날짜</p>
                <input
                  type="date"
                  value={newTodo.when}
                  onChange={e => setNewTodo({ ...newTodo, when: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1 px-1">기한</p>
                <input
                  type="date"
                  value={newTodo.deadline}
                  onChange={e => setNewTodo({ ...newTodo, deadline: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
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
    </div>
  )
}

function TodoItem({ todo, onToggle, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ name: todo.name, emoji: todo.emoji, when: todo.when, deadline: todo.deadline })
  const today = toDateKey(new Date())
  const isOverdue = todo.deadline && !todo.done && todo.deadline < today

  const saveEdit = () => {
    if (draft.name.trim()) onUpdate(todo.id, draft)
    setEditing(false)
  }

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
        <div className="space-y-2 mb-3">
          <div>
            <p className="text-xs text-gray-400 mb-1 px-1">할 날짜</p>
            <input
              type="date"
              value={draft.when}
              onChange={e => setDraft({ ...draft, when: e.target.value })}
              className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1 px-1">기한</p>
            <input
              type="date"
              value={draft.deadline}
              onChange={e => setDraft({ ...draft, deadline: e.target.value })}
              className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(false)} className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 bg-gray-50">취소</button>
          <button onClick={saveEdit} className="flex-1 py-2.5 rounded-xl text-sm text-white bg-emerald-400 font-medium">저장</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-gray-50 flex items-center gap-3 ${todo.done ? 'opacity-50' : ''}`}>
      <button
        onClick={() => onToggle(todo.id)}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${todo.done ? 'bg-emerald-400 border-emerald-400' : 'border-gray-200'}`}
      >
        {todo.done && (
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <span className="text-lg">{todo.emoji}</span>

      <div className="flex-1 min-w-0" onClick={() => !todo.done && setEditing(true)}>
        <p className={`text-sm font-medium text-gray-800 ${todo.done ? 'line-through text-gray-400' : ''}`}>
          {todo.name}
        </p>
        <div className="flex gap-2 mt-0.5 flex-wrap">
          {todo.when && <span className="text-xs text-blue-400">📅 {todo.when}</span>}
          {todo.deadline && (
            <span className={`text-xs ${isOverdue ? 'text-red-400 font-medium' : 'text-gray-400'}`}>
              {isOverdue ? '⚠️ ' : '⏰ '}{todo.deadline}
            </span>
          )}
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
