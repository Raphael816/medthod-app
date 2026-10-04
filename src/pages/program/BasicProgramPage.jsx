import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loading, ErrorState, Empty } from '../../components/StateViews'
import { StageIndicator } from '../../components/StageIndicator'
import { listUnits, listStudentUnits } from '../../services/units'
import { listMaterials, listMaterialProgress } from '../../services/materials'
import { listVideos, listVideoProgress } from '../../services/videos'
import { listAttempts } from '../../services/questions'
import { PROGRAM_STAGES } from '../../lib/programStages'

const STAGE = PROGRAM_STAGES[0]

export function BasicProgramPage({ student }) {
  const [state, setState] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      listUnits(),
      listStudentUnits(student.id),
      listMaterials(),
      listMaterialProgress(student.id),
      listVideos(),
      listVideoProgress(student.id),
      listAttempts(student.id),
    ])
      .then(([units, studentUnits, materials, materialProgress, videos, videoProgress, attempts]) =>
        setState({ units, studentUnits, materials, materialProgress, videos, videoProgress, attempts }),
      )
      .catch(() => setError('読み込みに失敗しました。'))
  }, [student.id])

  if (error) return <ErrorState message={error} />
  if (state === null) return <Loading />

  const { units, studentUnits, materials, materialProgress, videos, videoProgress, attempts } = state
  const unitsById = Object.fromEntries(units.map((u) => [u.id, u]))
  const registered = studentUnits.filter((su) => su.is_registered)
  const mastered = registered.filter((su) => su.status === '習得済み')
  const instructorAssigned = registered.filter((su) => su.is_instructor_assigned)
  const requiredMaterials = materials.filter((m) => m.is_required)
  const materialsCompleted = materials.filter((m) => materialProgress[m.id]?.is_completed).length
  const videosWithProgress = videos.filter((v) => (videoProgress[v.id]?.watched_ratio ?? 0) > 0)
  const graded = attempts.filter((a) => a.is_correct !== null && a.is_correct !== undefined)
  const correct = graded.filter((a) => a.is_correct).length
  const basicAccuracy = graded.length > 0 ? Math.round((correct / graded.length) * 100) : null

  return (
    <>
      <div className="page-header">
        <h1>{STAGE.shortName}</h1>
        <p>{STAGE.description}</p>
        <StageIndicator currentCode={STAGE.code} />
      </div>

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="value">{registered.length}</div>
          <div className="label">登録単元数</div>
        </div>
        <div className="stat-tile">
          <div className="value">{mastered.length}</div>
          <div className="label">習得済み単元数</div>
        </div>
        <div className="stat-tile">
          <div className="value">{materialsCompleted} / {materials.length}</div>
          <div className="label">教材完了数</div>
        </div>
        <div className="stat-tile">
          <div className="value">{videosWithProgress.length} / {videos.length}</div>
          <div className="label">視聴を始めた動画数</div>
        </div>
        <div className="stat-tile">
          <div className="value">{basicAccuracy != null ? `${basicAccuracy}%` : '-'}</div>
          <div className="label">基礎確認問題 正答率</div>
        </div>
      </div>

      <div className="card">
        <div className="section-title-row">
          <h2>講師指定単元(必須)</h2>
          <Link to="/study/units">単元一覧へ</Link>
        </div>
        {instructorAssigned.length === 0 ? (
          <Empty>現在、講師から指定された必須単元はありません。</Empty>
        ) : (
          <div className="unit-meta-row">
            {instructorAssigned.map((su) => (
              <Link key={su.id} to={`/study/units/${su.unit_id}`} style={{ textDecoration: 'none' }}>
                <span>{unitsById[su.unit_id]?.name ?? '単元'}({su.status})</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-title-row">
          <h2>必須教材</h2>
          <Link to="/study/materials">教材一覧へ</Link>
        </div>
        {requiredMaterials.length === 0 ? (
          <Empty>現在、必須指定された教材はありません。</Empty>
        ) : (
          requiredMaterials.map((m) => (
            <div className="upcoming-item" key={m.id}>
              <span>{m.title}</span>
              <span>{materialProgress[m.id]?.is_completed ? '完了' : '未完了'}</span>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <div className="section-title-row">
          <h2>基礎確認問題</h2>
          <Link to="/practice">問題演習へ</Link>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          教材・動画で学んだ単元ごとに、基礎確認問題で理解度を確かめましょう。志望校形式の演習(過去問・時間制限演習など)は、
          完全個別プログラム 志望校対策講座に含まれます。
        </p>
      </div>
    </>
  )
}
