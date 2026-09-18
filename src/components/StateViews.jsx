export function Loading({ label = '読み込み中...' }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="skeleton" style={{ height: 90, marginBottom: 12, borderRadius: 16 }} />
      <div className="skeleton" style={{ height: 90, borderRadius: 16 }} />
      <span className="empty-state" style={{ display: 'block', padding: '12px 0 0' }}>
        {label}
      </span>
    </div>
  )
}

export function ErrorState({ message = '読み込みに失敗しました。時間をおいて再度お試しください。' }) {
  return (
    <div className="error-state" role="alert">
      {message}
    </div>
  )
}

export function Empty({ children }) {
  return <div className="card empty-state">{children}</div>
}

export function ProgressBar({ value, max = 100, gold = false }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={gold ? 'progress-bar-fill gold' : 'progress-bar-fill'} style={{ width: `${pct}%` }} />
    </div>
  )
}
