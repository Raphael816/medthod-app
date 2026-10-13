import { useEffect, useState } from 'react'
import { Loading, ErrorState, Empty } from '../components/StateViews'
import {
  listUniversityProfiles,
  listTargetUniversities,
  addTargetUniversity,
  removeTargetUniversity,
  setPrimaryTargetUniversity,
} from '../services/universities'

export function UniversitiesPage({ student }) {
  const [profiles, setProfiles] = useState(null)
  const [targets, setTargets] = useState(null)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [busyId, setBusyId] = useState(null)

  async function load() {
    setError('')
    try {
      const [p, t] = await Promise.all([listUniversityProfiles(), listTargetUniversities(student.id)])
      setProfiles(p)
      setTargets(t)
    } catch {
      setError('読み込みに失敗しました。')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id])

  async function handleAdd(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const matched = profiles.find((p) => p.name === trimmed || p.aliases?.includes(trimmed))
    try {
      await addTargetUniversity(trimmed, matched?.id ?? null)
      setName('')
      load()
    } catch {
      setError('追加に失敗しました(すでに登録済みかもしれません)。')
    }
  }

  async function handleRemove(id) {
    setBusyId(id)
    try {
      await removeTargetUniversity(id)
      load()
    } catch {
      setError('削除に失敗しました。')
    }
    setBusyId(null)
  }

  async function handleSetPrimary(id) {
    setBusyId(id)
    try {
      await setPrimaryTargetUniversity(id)
      load()
    } catch {
      setError('第一志望の変更に失敗しました。')
    }
    setBusyId(null)
  }

  if (error) return <ErrorState message={error} />
  if (profiles === null || targets === null) return <Loading />

  return (
    <>
      <div className="page-header">
        <h1>志望大学</h1>
        <p>
          志望順位を登録すると、AIのプラン生成やホーム画面に反映されます。第一志望を変更すると、
          確認待ちのプラン下書きがある場合は新しい志望校にあわせて自動的に作り直されます(講師の確認後に公開されます)。
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleAdd} className="form-group" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            list="university-options"
            style={{ flex: 1, minWidth: 200 }}
            placeholder="大学名を入力(候補にあれば対策情報が自動で紐づきます)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="志望大学名"
          />
          <datalist id="university-options">
            {profiles.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
          <button className="btn btn-primary" type="submit">
            志望校を追加
          </button>
        </form>
      </div>

      {targets.length === 0 ? (
        <Empty>まだ志望大学が登録されていません。</Empty>
      ) : (
        targets.map((t) => (
          <div className="card" key={t.id}>
            <div className="content-card-row">
              <div>
                <span className="badge-required">第{t.rank}志望</span>
                <h2 style={{ fontSize: '1.1rem', margin: '8px 0 0' }}>{t.university_name}</h2>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {t.rank !== 1 && (
                  <button className="btn btn-outline btn-sm" onClick={() => handleSetPrimary(t.id)} disabled={busyId === t.id}>
                    第一志望にする
                  </button>
                )}
                <button className="btn btn-outline btn-sm" onClick={() => handleRemove(t.id)} disabled={busyId === t.id}>
                  削除
                </button>
              </div>
            </div>
            {t.university_profiles ? (
              <div className="explanation-box" style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
                {t.university_profiles.summary}
                <div style={{ marginTop: 8, fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  出典: {t.university_profiles.source_url}(非公式情報)
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 8 }}>
                対策情報のデータベースには未収録の大学です。
              </p>
            )}
          </div>
        ))
      )}
    </>
  )
}
