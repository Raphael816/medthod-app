import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { StudyTabs } from '../../components/StudyTabs'
import { Loading, ErrorState, Empty } from '../../components/StateViews'
import { listMaterials, listMaterialProgress } from '../../services/materials'

export function MaterialsListPage({ student }) {
  const [materials, setMaterials] = useState(null)
  const [progress, setProgress] = useState({})
  const [error, setError] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    Promise.all([listMaterials(), listMaterialProgress(student.id)])
      .then(([m, p]) => {
        setMaterials(m)
        setProgress(p)
      })
      .catch(() => setError('読み込みに失敗しました。'))
  }, [student.id])

  const subjects = useMemo(() => [...new Set((materials ?? []).map((m) => m.units?.subject).filter(Boolean))], [materials])

  const filtered = useMemo(() => {
    if (!materials) return []
    return materials.filter((m) => {
      if (subjectFilter && m.units?.subject !== subjectFilter) return false
      const p = progress[m.id]
      const status = p?.is_completed ? '完了' : p?.last_page ? '途中' : '未着手'
      if (statusFilter && status !== statusFilter) return false
      return true
    })
  }, [materials, progress, subjectFilter, statusFilter])

  if (error) return <ErrorState message={error} />

  return (
    <>
      <div className="page-header">
        <h1>教材</h1>
        <p>単元に紐づく教材を確認・閲覧できます。</p>
      </div>
      <StudyTabs />

      <div className="filter-bar">
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} aria-label="科目で絞り込み">
          <option value="">すべての科目</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="進捗で絞り込み">
          <option value="">すべての進捗</option>
          <option value="未着手">未着手</option>
          <option value="途中">途中</option>
          <option value="完了">完了</option>
        </select>
      </div>

      {materials === null ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <Empty>該当する教材がありません。</Empty>
      ) : (
        <div className="content-list">
          {filtered.map((m) => {
            const p = progress[m.id]
            return (
              <Link key={m.id} to={`/study/materials/${m.id}`} className="content-card" style={{ textDecoration: 'none' }}>
                <div className="content-card-row">
                  <div>
                    <h3>{m.title}</h3>
                    {m.units && <span className="unit-tag">{m.units.subject} / {m.units.name}</span>}
                  </div>
                  {m.is_required ? <span className="badge-required">必須</span> : <span className="badge-optional">任意</span>}
                </div>
                {m.description && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '8px 0 0' }}>{m.description}</p>}
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '6px 0 0' }}>
                  {p?.is_completed ? '完了済み' : p?.last_page ? `${p.last_page}ページまで既読` : '未着手'}
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
