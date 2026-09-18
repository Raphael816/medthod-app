import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Loading, ErrorState, ProgressBar } from '../../components/StateViews'
import { listUnits } from '../../services/units'
import { listMaterials, listMaterialProgress } from '../../services/materials'
import { listVideos, listVideoProgress } from '../../services/videos'
import { listAttempts } from '../../services/questions'
import { aggregateUnitMastery } from '../../services/grades'
import { listMemos, addMemo } from '../../services/notes'

export function UnitDetailPage({ student }) {
  const { unitId } = useParams()
  const [state, setState] = useState(null)
  const [error, setError] = useState('')
  const [memoText, setMemoText] = useState('')

  async function load() {
    setError('')
    try {
      const [units, materials, materialProgress, videos, videoProgress, attempts, memos] = await Promise.all([
        listUnits(),
        listMaterials(),
        listMaterialProgress(student.id),
        listVideos(),
        listVideoProgress(student.id),
        listAttempts(student.id),
        listMemos(student.id, { unitId }),
      ])
      setState({ units, materials, materialProgress, videos, videoProgress, attempts, memos })
    } catch {
      setError('読み込みに失敗しました。')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id, unitId])

  async function handleAddMemo(e) {
    e.preventDefault()
    if (!memoText.trim()) return
    await addMemo(student.id, memoText.trim(), { unitId })
    setMemoText('')
    load()
  }

  if (error) return <ErrorState message={error} />
  if (state === null) return <Loading />

  const unit = state.units.find((u) => u.id === unitId)
  if (!unit) return <ErrorState message="単元が見つかりません。" />

  const unitMaterials = state.materials.filter((m) => m.unit_id === unit.id)
  const unitVideos = state.videos.filter((v) => v.unit_id === unit.id)
  const mastery = aggregateUnitMastery([], state.attempts, [unit])[0]
  const related = state.units.filter((u) => u.subject === unit.subject && u.id !== unit.id).slice(0, 5)

  return (
    <>
      <div className="page-header">
        <p style={{ marginBottom: 4 }}>
          <Link to="/study/units">← 登録中の単元</Link>
        </p>
        <h1>{unit.name}</h1>
        <p>{unit.subject}</p>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: 8 }}>単元の概要</h2>
        <p style={{ color: 'var(--text-muted)' }}>{unit.description || '概要は未登録です。'}</p>
        <div className="unit-meta-row">
          {unit.difficulty && <span>難易度 {'★'.repeat(unit.difficulty)}</span>}
          {unit.standard_hours && <span>標準学習時間 約{unit.standard_hours}時間</span>}
          <span>確認問題正答率 {mastery?.accuracy != null ? `${mastery.accuracy}%` : 'まだ記録なし'}</span>
        </div>
      </div>

      <div className="card">
        <div className="section-title-row">
          <h2>教材</h2>
          <Link to="/study/materials">教材一覧へ</Link>
        </div>
        {unitMaterials.length === 0 ? (
          <p className="empty-state">この単元に紐づく教材はまだありません。</p>
        ) : (
          <div className="content-list">
            {unitMaterials.map((m) => {
              const progress = state.materialProgress[m.id]
              return (
                <Link key={m.id} to={`/study/materials/${m.id}`} className="content-card" style={{ textDecoration: 'none' }}>
                  <div className="content-card-row">
                    <h3>{m.title}</h3>
                    {m.is_required ? <span className="badge-required">必須</span> : <span className="badge-optional">任意</span>}
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                    {progress?.is_completed ? '完了済み' : progress?.last_page ? `${progress.last_page}ページまで既読` : '未着手'}
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-title-row">
          <h2>動画</h2>
          <Link to="/study/videos">動画一覧へ</Link>
        </div>
        {unitVideos.length === 0 ? (
          <p className="empty-state">この単元に紐づく動画はまだありません。</p>
        ) : (
          <div className="content-list">
            {unitVideos.map((v) => {
              const progress = state.videoProgress[v.id]
              return (
                <Link key={v.id} to={`/study/videos/${v.id}`} className="content-card" style={{ textDecoration: 'none' }}>
                  <div className="content-card-row">
                    <h3>{v.title}</h3>
                    {v.is_required ? <span className="badge-required">必須</span> : <span className="badge-optional">任意</span>}
                  </div>
                  <ProgressBar value={progress?.watched_ratio ?? 0} max={100} gold />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>確認問題</h2>
        <Link className="btn btn-primary" to={`/practice/${unit.id}`}>
          この単元の確認問題を解く
        </Link>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>学習メモ</h2>
        <form onSubmit={handleAddMemo} className="form-group">
          <textarea
            rows={2}
            value={memoText}
            onChange={(e) => setMemoText(e.target.value)}
            placeholder="気づいたことをメモする"
          />
          <button className="btn btn-outline btn-sm" type="submit" style={{ marginTop: 8 }}>
            メモを追加
          </button>
        </form>
        {state.memos.length > 0 && (
          <div className="memo-list">
            {state.memos.map((m) => (
              <div className="memo-item" key={m.id}>
                {m.body}
                <time>{new Date(m.created_at).toLocaleString('ja-JP')}</time>
              </div>
            ))}
          </div>
        )}
      </div>

      {related.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>関連単元</h2>
          <div className="unit-meta-row">
            {related.map((r) => (
              <Link key={r.id} to={`/study/units/${r.id}`} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 12px' }}>
                {r.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
