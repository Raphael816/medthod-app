import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Loading, ErrorState } from '../../components/StateViews'
import { getMaterial, getSignedMaterialUrl, saveMaterialProgress } from '../../services/materials'
import { addMemo, listMemos, addBookmark, listBookmarks } from '../../services/notes'

export function MaterialDetailPage({ student }) {
  const { materialId } = useParams()
  const navigate = useNavigate()
  const [material, setMaterial] = useState(null)
  const [signedUrl, setSignedUrl] = useState(null)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [saving, setSaving] = useState(false)
  const [memoText, setMemoText] = useState('')
  const [memos, setMemos] = useState([])
  const [bookmarks, setBookmarks] = useState([])

  async function load() {
    setError('')
    try {
      const m = await getMaterial(materialId)
      setMaterial(m)
      setSignedUrl(await getSignedMaterialUrl(m.storage_path))
      setMemos(await listMemos(student.id, { materialId }))
      setBookmarks(await listBookmarks(student.id, { materialId }))
    } catch {
      setError('教材の読み込みに失敗しました。')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialId])

  async function handleSavePosition() {
    setSaving(true)
    await saveMaterialProgress(student.id, materialId, { lastPage: page, isCompleted: false })
    setSaving(false)
  }

  async function handleComplete() {
    await saveMaterialProgress(student.id, materialId, { lastPage: page, isCompleted: true })
    if (material.unit_id) navigate(`/practice/${material.unit_id}`)
  }

  async function handleAddMemo(e) {
    e.preventDefault()
    if (!memoText.trim()) return
    await addMemo(student.id, memoText.trim(), { materialId })
    setMemoText('')
    setMemos(await listMemos(student.id, { materialId }))
  }

  async function handleBookmark() {
    await addBookmark(student.id, { label: `${page}ページ`, position: page }, { materialId })
    setBookmarks(await listBookmarks(student.id, { materialId }))
  }

  if (error) return <ErrorState message={error} />
  if (!material) return <Loading />

  return (
    <>
      <div className="page-header">
        <p style={{ marginBottom: 4 }}>
          <Link to="/study/materials">← 教材一覧</Link>
        </p>
        <h1>{material.title}</h1>
        {material.units && <p>{material.units.subject} / {material.units.name}</p>}
      </div>

      <div className="card">
        {(material.purpose || material.goal) && (
          <div className="unit-meta-row" style={{ marginBottom: 12 }}>
            {material.purpose && <span>学習目的: {material.purpose}</span>}
            {material.goal && <span>到達目標: {material.goal}</span>}
          </div>
        )}
        <div className="viewer-toolbar">
          <label>
            現在のページ:{' '}
            <input type="number" min={1} value={page} onChange={(e) => setPage(Number(e.target.value) || 1)} />
          </label>
          <button className="btn btn-outline btn-sm" onClick={handleSavePosition} disabled={saving}>
            {saving ? '保存中...' : '読了位置を保存'}
          </button>
          <button className="btn btn-outline btn-sm" onClick={handleBookmark}>
            このページをブックマーク
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleComplete}>
            学習完了にする
          </button>
        </div>
        {signedUrl && (
          <div className="pdf-viewer">
            <iframe src={signedUrl} title={material.title} />
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

      {material.unit_id && (
        <div className="card">
          <Link className="btn btn-primary" to={`/practice/${material.unit_id}`}>
            確認問題に進む
          </Link>
        </div>
      )}
    </>
  )
}
