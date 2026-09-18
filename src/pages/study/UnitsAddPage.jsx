import { useEffect, useMemo, useState } from 'react'
import { StudyTabs } from '../../components/StudyTabs'
import { Loading, ErrorState } from '../../components/StateViews'
import { listUnits, listStudentUnits, registerUnit } from '../../services/units'
import { callStudentApi } from '../../lib/studentApi'

function Stars({ value }) {
  if (!value) return null
  return <span aria-label={`難易度${value}`}>{'★'.repeat(value)}{'☆'.repeat(5 - value)}</span>
}

export function UnitsAddPage({ student }) {
  const [units, setUnits] = useState(null)
  const [studentUnits, setStudentUnits] = useState({})
  const [error, setError] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [subjectFilter, setSubjectFilter] = useState('')
  const [search, setSearch] = useState('')

  async function load() {
    setError('')
    try {
      const [u, su] = await Promise.all([listUnits(), listStudentUnits(student.id)])
      setUnits(u)
      setStudentUnits(Object.fromEntries(su.map((s) => [s.unit_id, s])))
    } catch {
      setError('読み込みに失敗しました。')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id])

  async function handleRegister(unitId) {
    await registerUnit(student.id, unitId)
    load()
  }

  async function handleRecommend() {
    setAiLoading(true)
    setError('')
    try {
      await callStudentApi('recommend_units')
      await load()
    } catch {
      setError('AIによる提案の生成に失敗しました。時間をおいて再度お試しください。')
    }
    setAiLoading(false)
  }

  const subjects = useMemo(() => [...new Set((units ?? []).map((u) => u.subject))], [units])
  const filtered = useMemo(() => {
    if (!units) return []
    return units.filter((u) => {
      if (subjectFilter && u.subject !== subjectFilter) return false
      if (search && !u.name.includes(search) && !u.subject.includes(search)) return false
      return true
    })
  }, [units, subjectFilter, search])

  return (
    <>
      <div className="page-header">
        <h1>単元を追加</h1>
        <p>科目・単元一覧から登録するか、AIのおすすめから一括登録できます。</p>
      </div>
      <StudyTabs />

      {error && <ErrorState message={error} />}

      <div className="card" style={{ marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={handleRecommend} disabled={aiLoading}>
          {aiLoading ? 'AIが提案を作成中...' : '🤖 AIによるおすすめ一括登録'}
        </button>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8, marginBottom: 0 }}>
          これまでの演習結果から、単元ごとの優先度をAIが提案し、優先度が0より高い単元を自動的に登録します。
        </p>
      </div>

      <div className="filter-bar">
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} aria-label="科目で絞り込み">
          <option value="">すべての科目</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="単元名で検索"
          aria-label="単元名で検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {units === null ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <div className="card empty-state">該当する単元がありません。</div>
      ) : (
        <div className="unit-grid">
          {filtered.map((u) => {
            const su = studentUnits[u.id]
            const registered = su?.is_registered
            return (
              <div className="unit-card" key={u.id}>
                <div className="unit-card-header">
                  <div>
                    <div className="subject-label">{u.subject}</div>
                    <h3>{u.name}</h3>
                  </div>
                  {registered && <span className={`unit-status-badge status-${su.status}`}>{su.status}</span>}
                </div>
                {u.description && <p className="desc">{u.description}</p>}
                <div className="unit-meta-row">
                  {u.difficulty && (
                    <span>
                      難易度 <Stars value={u.difficulty} />
                    </span>
                  )}
                  {u.standard_hours && <span>標準学習時間 約{u.standard_hours}時間</span>}
                </div>
                <div className="unit-card-actions">
                  {registered ? (
                    <span className="badge-optional">登録済み</span>
                  ) : (
                    <button className="btn btn-outline btn-sm" onClick={() => handleRegister(u.id)}>
                      登録する
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
