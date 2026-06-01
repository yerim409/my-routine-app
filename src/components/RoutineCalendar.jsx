export default function RoutineCalendar({ routine, allChecks, onClose }) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = now.getDate()
  const monthName = now.toLocaleDateString('ko-KR', { month: 'long' })

  const getCompleted = (day) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return !!(allChecks[dateKey] && allChecks[dateKey][routine.id])
  }

  const completedDays = Array.from({ length: today }, (_, i) => i + 1).filter(d => getCompleted(d)).length
  const rate = Math.round((completedDays / today) * 100)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-3xl p-6 pb-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{routine.emoji}</span>
            <div>
              <h2 className="text-base font-bold text-gray-900">{routine.name}</h2>
              <p className="text-xs text-gray-400">{monthName} · {completedDays}/{today}일 달성 · {rate}%</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-300 text-xl p-1">✕</button>
        </div>

        <div className="grid grid-cols-7 mb-2">
          {['일', '월', '화', '수', '목', '금', '토'].map(d => (
            <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-2">
          {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const isFuture = day > today
            const isToday = day === today
            const completed = !isFuture && getCompleted(day)

            return (
              <div key={day} className="flex flex-col items-center gap-0.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  completed
                    ? 'bg-emerald-400 text-white'
                    : isToday
                    ? 'border-2 border-emerald-400 text-emerald-500'
                    : isFuture
                    ? 'text-gray-200'
                    : 'text-gray-300'
                }`}>
                  {day}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-5 bg-gray-100 rounded-full h-2">
          <div className="bg-emerald-400 h-2 rounded-full transition-all" style={{ width: `${rate}%` }} />
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">이번 달 달성률 {rate}%</p>
      </div>
    </div>
  )
}
