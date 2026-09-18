import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StudyTabs } from '../../components/StudyTabs'
import { Loading, ErrorState, Empty } from '../../components/StateViews'
import { listReviewSchedules, markReviewDone } from '../../services/review'
import { listUnits, listStudentUnits } from '../../services/units'

export function ReviewPage({ student }) {
  const [state, setState] = useState(null)
  const [error, setError] = useState('')

  async function load() {
    setError('')
    try {
      const [reviews, units, studentUnits] = await Promise.all([
        listReviewSchedules(student.id),
        listUnits(),
        listStudentUnits(student.id),
      ])
      setState({ reviews, units, studentUnits })
    } catch {
      setError('読み込みに失敗しました。')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id])

  async function handleDone(id) {
    await markReviewDone(id)
    load()
  }

  if (error) return <ErrorState message={error} />
  if (state === null) return <Loading />

  const unitsById = Object.fromEntries(state.units.map((u) => [u.id, u]))
  const weakUnits = state.studentUnits.filter((su) => su.status === '苦手' && unitsById[su.unit_id])
  const today = new Date().toISOString().slice(0, 10)

  return (
    <>
      <div className="page-header">
        <h1>復習</h1>
        <p>復習予定日が来た単元や、苦手判定されている単元をまとめて確認できます。</p>
      </div>
      <StudyTabs />

      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>復習予定</h2>
        {state.reviews.length === 0 ? (
          <p className="empty-state">復習予定はありません。</p>
        ) : (
          state.reviews.map((r) => (
            <div key={r.id} className="upcoming-item">
              <div>
                <strong>{r.units?.name}</strong>
                {r.reason && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.reason}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={r.due_date <= today ? 'upcoming-date soon' : 'upcoming-date'}>{r.due_date}</span>
                <Link className="btn btn-outline btn-sm" to={`/study/units/${r.unit_id}`}>
                  復習する
                </Link>
                <button className="btn btn-outline btn-sm" onClick={() => handleDone(r.id)}>
                  完了
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>苦手判定されている単元</h2>
        {weakUnits.length === 0 ? (
          <Empty>苦手判定されている単元はありません。</Empty>
        ) : (
          <div className="unit-grid">
            {weakUnits.map((su) => {
              const unit = unitsById[su.unit_id]
              return (
                <div className="unit-card" key={su.id}>
                  <div className="unit-card-header">
                    <div>
                      <div className="subject-label">{unit.subject}</div>
                      <h3>{unit.name}</h3>
                    </div>
                    <span className="unit-status-badge status-苦手">苦手</span>
                  </div>
                  <div className="unit-card-actions">
                    <Link className="btn btn-primary btn-sm" to={`/study/units/${unit.id}`}>
                      復習教材を見る
                    </Link>
                    <Link className="btn btn-outline btn-sm" to={`/practice/${unit.id}`}>
                      問題を解き直す
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
