import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StudyTabs } from '../../components/StudyTabs'
import { Loading, ErrorState, Empty, ProgressBar } from '../../components/StateViews'
import { listUnits, listStudentUnits, updateUnitStatus, unregisterUnit } from '../../services/units'
import { listMaterials, listMaterialProgress } from '../../services/materials'
import { listVideos, listVideoProgress } from '../../services/videos'
import { listAttempts } from '../../services/questions'
import { aggregateUnitMastery } from '../../services/grades'
import { listReviewSchedules } from '../../services/review'

const STATUS_OPTIONS = ['未着手', '学習中', '復習中', '習得済み', '苦手', '一時停止']

export function UnitsRegisteredPage({ student }) {
  const [state, setState] = useState(null)
  const [error, setError] = useState('')

  async function load() {
    setError('')
    try {
      const [units, studentUnits, materials, materialProgress, videos, videoProgress, attempts, reviews] =
        await Promise.all([
          listUnits(),
          listStudentUnits(student.id),
          listMaterials(),
          listMaterialProgress(student.id),
          listVideos(),
          listVideoProgress(student.id),
          listAttempts(student.id),
          listReviewSchedules(student.id),
        ])
      setState({ units, studentUnits, materials, materialProgress, videos, videoProgress, attempts, reviews })
    } catch {
      setError('読み込みに失敗しました。')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id])

  async function handleStatusChange(unitId, status) {
    await updateUnitStatus(student.id, unitId, status)
    load()
  }

  async function handleUnregister(unitId) {
    await unregisterUnit(student.id, unitId)
    load()
  }

  if (error) return <ErrorState message={error} />
  if (state === null) return <Loading />

  const registered = state.studentUnits.filter((su) => su.is_registered)
  const unitsById = Object.fromEntries(state.units.map((u) => [u.id, u]))
  const mastery = Object.fromEntries(
    aggregateUnitMastery(
      [], // 週次演習は成績画面側で見るため、ここでは確認問題ベースのみ集計
      state.attempts,
      state.units,
    ).map((m) => [m.unit.id, m]),
  )
  const nextReviewByUnit = Object.fromEntries(
    state.reviews.map((r) => [r.unit_id, r]).filter(([, r]) => r),
  )

  return (
    <>
      <div className="page-header">
        <h1>登録中の単元</h1>
        <p>登録した単元の進捗を確認し、続きから学習を始められます。</p>
      </div>
      <StudyTabs />

      {registered.length === 0 ? (
        <Empty>
          まだ単元を登録していません。<Link to="/study/units/add">単元を追加</Link>から登録してください。
        </Empty>
      ) : (
        <div className="unit-grid">
          {registered.map((su) => {
            const unit = unitsById[su.unit_id]
            if (!unit) return null
            const unitMaterials = state.materials.filter((m) => m.unit_id === unit.id)
            const unitVideos = state.videos.filter((v) => v.unit_id === unit.id)
            const materialsDone = unitMaterials.filter((m) => state.materialProgress[m.id]?.is_completed).length
            const videoRatios = unitVideos.map((v) => state.videoProgress[v.id]?.watched_ratio ?? 0)
            const avgVideoRatio = videoRatios.length ? Math.round(videoRatios.reduce((a, b) => a + b, 0) / videoRatios.length) : null
            const m = mastery[unit.id]
            const nextReview = nextReviewByUnit[unit.id]

            return (
              <div className="unit-card" key={unit.id}>
                <div className="unit-card-header">
                  <div>
                    <div className="subject-label">{unit.subject}</div>
                    <h3>{unit.name}</h3>
                  </div>
                  <span className={`unit-status-badge status-${su.status}`}>{su.status}</span>
                </div>

                {unitMaterials.length > 0 && (
                  <div>
                    <div className="task-meta-line">教材 {materialsDone}/{unitMaterials.length}件完了</div>
                    <ProgressBar value={materialsDone} max={unitMaterials.length} />
                  </div>
                )}
                {avgVideoRatio !== null && (
                  <div>
                    <div className="task-meta-line">動画視聴率 平均{avgVideoRatio}%</div>
                    <ProgressBar value={avgVideoRatio} max={100} gold />
                  </div>
                )}
                <div className="unit-meta-row">
                  <span>確認問題正答率 {m?.accuracy != null ? `${m.accuracy}%` : 'まだ記録なし'}</span>
                  {nextReview && <span>次回復習 {nextReview.due_date}</span>}
                </div>

                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  ステータス
                  <select
                    value={su.status}
                    onChange={(e) => handleStatusChange(unit.id, e.target.value)}
                    style={{ display: 'block', marginTop: 4, width: '100%' }}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="unit-card-actions">
                  <Link className="btn btn-primary btn-sm" to={`/study/units/${unit.id}`}>
                    続きから学習する
                  </Link>
                  {su.is_instructor_assigned ? (
                    <span className="instructor-lock">🔒 講師指定(解除不可)</span>
                  ) : (
                    <button className="btn btn-outline btn-sm" onClick={() => handleUnregister(unit.id)}>
                      登録解除
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
