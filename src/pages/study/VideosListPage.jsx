import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StudyTabs } from '../../components/StudyTabs'
import { Loading, ErrorState, Empty, ProgressBar } from '../../components/StateViews'
import { listVideos, listVideoProgress } from '../../services/videos'

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function VideosListPage({ student }) {
  const [videos, setVideos] = useState(null)
  const [progress, setProgress] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([listVideos(), listVideoProgress(student.id)])
      .then(([v, p]) => {
        setVideos(v)
        setProgress(p)
      })
      .catch(() => setError('読み込みに失敗しました。'))
  }, [student.id])

  if (error) return <ErrorState message={error} />

  return (
    <>
      <div className="page-header">
        <h1>動画</h1>
        <p>視聴が完了しても、学力評価には反映されません。学習内容は確認問題で確かめてください。</p>
      </div>
      <StudyTabs />

      {videos === null ? (
        <Loading />
      ) : videos.length === 0 ? (
        <Empty>公開されている動画はまだありません。</Empty>
      ) : (
        <div className="content-list">
          {videos.map((v) => {
            const p = progress[v.id]
            return (
              <Link key={v.id} to={`/study/videos/${v.id}`} className="content-card" style={{ textDecoration: 'none' }}>
                <div className="content-card-row">
                  <div>
                    <h3>{v.title}</h3>
                    <span className="unit-tag">
                      {v.units ? `${v.units.subject} / ${v.units.name}` : '単元未設定'} ・ {formatDuration(v.duration_seconds)}
                      {v.instructor_name && ` ・ ${v.instructor_name}`}
                    </span>
                  </div>
                  {v.is_required ? <span className="badge-required">必須</span> : <span className="badge-optional">任意</span>}
                </div>
                <div style={{ marginTop: 10 }}>
                  <ProgressBar value={p?.watched_ratio ?? 0} max={100} gold />
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    視聴率 {Math.round(p?.watched_ratio ?? 0)}%{p?.is_completed && '(視聴完了)'}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
