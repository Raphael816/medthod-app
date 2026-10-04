import { Link } from 'react-router-dom'
import { PROGRAM_STAGES } from '../lib/programStages'

// チェックマーク・現在地マーカーも構造的なSVG(絵文字は使わない)。
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// 現在の段階を3ステップで示す。色だけで状態を表さず、「現在地」「完了」の文言も併記する。
export function StageIndicator({ currentCode }) {
  const currentOrder = PROGRAM_STAGES.find((s) => s.code === currentCode)?.order ?? 0

  return (
    <div className="stage-indicator" role="list" aria-label="学習段階">
      {PROGRAM_STAGES.map((stage) => {
        const isDone = stage.order < currentOrder
        const isCurrent = stage.order === currentOrder
        const state = isCurrent ? 'current' : isDone ? 'done' : 'upcoming'
        return (
          <Link
            key={stage.code}
            to={stage.routePath}
            role="listitem"
            className={`stage-step stage-step-${state}`}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span className="stage-step-marker">
              {isDone ? <CheckIcon /> : stage.order}
            </span>
            <span className="stage-step-label">
              {stage.shortName}
              <span className="stage-step-status">
                {isCurrent ? '(現在の段階)' : isDone ? '(完了)' : ''}
              </span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}
