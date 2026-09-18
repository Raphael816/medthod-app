import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Loading, ErrorState } from '../../components/StateViews'
import { getVideo, saveVideoProgress, listVideoProgress } from '../../services/videos'
import { addMemo, listMemos, addBookmark, listBookmarks } from '../../services/notes'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function VideoDetailPage({ student }) {
  const { videoId } = useParams()
  const [video, setVideo] = useState(null)
  const [error, setError] = useState('')
  const [memoText, setMemoText] = useState('')
  const [memos, setMemos] = useState([])
  const [bookmarks, setBookmarks] = useState([])
  const videoRef = useRef(null)
  const lastSaveRef = useRef(0)
  const resumeRef = useRef(0)

  async function load() {
    setError('')
    try {
      // video の src が付いた瞬間に <video> が loadedmetadata を発火しうるため、
      // resumeRef は setVideo より前に必ず確定させておく(順序が逆だと再生位置の復元が効かない)。
      const [v, memosData, bookmarksData, progress] = await Promise.all([
        getVideo(videoId),
        listMemos(student.id, { videoId }),
        listBookmarks(student.id, { videoId }),
        listVideoProgress(student.id),
      ])
      resumeRef.current = progress[videoId]?.position_seconds ?? 0
      setMemos(memosData)
      setBookmarks(bookmarksData)
      setVideo(v)
    } catch {
      setError('動画の読み込みに失敗しました。')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  function handleLoadedMetadata() {
    if (videoRef.current && resumeRef.current > 0) {
      videoRef.current.currentTime = resumeRef.current
    }
  }

  async function persistProgress() {
    const el = videoRef.current
    if (!el || !el.duration) return
    const ratio = (el.currentTime / el.duration) * 100
    await saveVideoProgress(student.id, videoId, {
      positionSeconds: el.currentTime,
      watchedRatio: ratio,
      isCompleted: ratio >= 90,
    })
  }

  function handleTimeUpdate() {
    const now = Date.now()
    if (now - lastSaveRef.current > 8000) {
      lastSaveRef.current = now
      persistProgress()
    }
  }

  function seekBy(delta) {
    if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime + delta)
  }

  function setSpeed(rate) {
    if (videoRef.current) videoRef.current.playbackRate = rate
  }

  function jumpToChapter(sec) {
    if (videoRef.current) {
      videoRef.current.currentTime = sec
      videoRef.current.play()
    }
  }

  async function handleAddMemo(e) {
    e.preventDefault()
    if (!memoText.trim()) return
    await addMemo(student.id, memoText.trim(), { videoId })
    setMemoText('')
    setMemos(await listMemos(student.id, { videoId }))
  }

  async function handleBookmark() {
    const t = videoRef.current?.currentTime ?? 0
    await addBookmark(student.id, { label: formatTime(t), position: t }, { videoId })
    setBookmarks(await listBookmarks(student.id, { videoId }))
  }

  const speeds = useMemo(() => [0.75, 1, 1.25, 1.5, 2], [])

  if (error) return <ErrorState message={error} />
  if (!video) return <Loading />

  return (
    <>
      <div className="page-header">
        <p style={{ marginBottom: 4 }}>
          <Link to="/study/videos">← 動画一覧</Link>
        </p>
        <h1>{video.title}</h1>
        {video.units && <p>{video.units.subject} / {video.units.name}{video.instructor_name && ` ・ ${video.instructor_name}`}</p>}
      </div>

      <div className="card">
        <div className="video-player-wrap">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            src={video.video_url}
            controls
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPause={persistProgress}
            onEnded={persistProgress}
          />
        </div>
        <div className="viewer-toolbar">
          <button className="btn btn-outline btn-sm" onClick={() => seekBy(-10)}>
            ⏪ 10秒戻る
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => seekBy(10)}>
            10秒進む ⏩
          </button>
          {speeds.map((s) => (
            <button key={s} className="btn btn-outline btn-sm" onClick={() => setSpeed(s)}>
              {s}x
            </button>
          ))}
          <button className="btn btn-outline btn-sm" onClick={handleBookmark}>
            この位置をブックマーク
          </button>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          字幕には現在対応していません。視聴完了は学力評価に使いません — 確認問題で理解度を確かめてください。
        </p>

        {video.video_chapters.length > 0 && (
          <div className="chapter-list">
            <h2 style={{ fontSize: '1rem' }}>チャプター</h2>
            {video.video_chapters.map((c) => (
              <div key={c.id} className="chapter-item" role="button" tabIndex={0} onClick={() => jumpToChapter(c.start_seconds)}
                onKeyDown={(e) => e.key === 'Enter' && jumpToChapter(c.start_seconds)}>
                <span>{c.title}</span>
                <span>{formatTime(c.start_seconds)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {bookmarks.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: '1.05rem', marginBottom: 10 }}>ブックマーク</h2>
          <div className="unit-meta-row">
            {bookmarks.map((b) => (
              <span key={b.id}>{b.label}</span>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ fontSize: '1.05rem', marginBottom: 10 }}>学習メモ</h2>
        <form onSubmit={handleAddMemo} className="form-group">
          <textarea rows={2} value={memoText} onChange={(e) => setMemoText(e.target.value)} placeholder="気づいたことをメモする" />
          <button className="btn btn-outline btn-sm" type="submit" style={{ marginTop: 8 }}>
            メモを追加
          </button>
        </form>
        {memos.length > 0 && (
          <div className="memo-list">
            {memos.map((m) => (
              <div className="memo-item" key={m.id}>
                {m.body}
                <time>{new Date(m.created_at).toLocaleString('ja-JP')}</time>
              </div>
            ))}
          </div>
        )}
      </div>

      {video.unit_id && (
        <div className="card">
          <Link className="btn btn-primary" to={`/practice/${video.unit_id}`}>
            確認問題に進む
          </Link>
        </div>
      )}
    </>
  )
}
