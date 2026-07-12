// 헤더 한 줄 인사말 — 명언 대신 오늘 상태 요약.
// routineTotal/routineDone은 루틴 탭 달성률 카드와 같은 기준
// (주 N회 루틴은 체크한 날만 분자·분모에 포함).

export function buildGreeting({ hour, routineTotal = 0, routineDone = 0, todoRemaining = 0, todoDoneToday = 0 }) {
  const routineLeft = Math.max(0, routineTotal - routineDone)
  const started = routineTotal > 0 || todoRemaining > 0 || todoDoneToday > 0
  if (!started) return '루틴과 할 일을 추가하고 시작해봐요'
  if (routineLeft === 0 && todoRemaining === 0) return '오늘 할 일을 다 끝냈어요. 푹 쉬어요 🎉'

  const parts = []
  if (routineLeft > 0) parts.push(`루틴 ${routineLeft}개`)
  if (todoRemaining > 0) parts.push(`할 일 ${todoRemaining}개`)
  const summary = parts.join(' · ')

  if (hour < 12) return `오늘은 ${summary} — 가볍게 시작해요`
  if (hour < 18) return `${summary} 남았어요`
  return `${summary} 남았어요 — 오늘 하루 마무리해볼까요?`
}
