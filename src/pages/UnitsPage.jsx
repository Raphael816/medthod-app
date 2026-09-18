import { useEffect, useState } from 'react'
import { callStudentApi } from '../lib/studentApi'
import { supabase } from '../lib/supabase'

const STARS = [0, 1, 2, 3, 4, 5]

function StarPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {STARS.slice(1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? 0 : n)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.1rem',
            color: n <= value ? 'var(--gold)' : 'var(--border)',
            padding: 2,
          }}
          aria-label={`優先度${n}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export function UnitsPage({ student }) {
  const [units, setUnits] = useState(null)
  const [priorities, setPriorities] = useState({})
  const [aiLoading, setAiLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    const { data: unitRows } = await supabase.from('units').select('id, subject, name').order('sort_order')
    setUnits(unitRows ?? [])
    const { data: priorityRows } = await supabase
      .from('student_unit_priorities')
      .select('unit_id, priority')
      .eq('student_id', student.id)
    const map = {}
    for (const p of priorityRows ?? []) map[p.unit_id] = p.priority
    setPriorities(map)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id])

  async function handleRecommend() {
    setAiLoading(true)
    setMessage('')
    try {
      const rows = await callStudentApi('recommend_units')
      setMessage(`${rows.length}件の単元に優先度を反映しました。内容は下から調整できます。`)
      await load()
    } catch (err) {
      setMessage('AI提案の生成に失敗しました。時間をおいて再度お試しください。')
    }
    setAiLoading(false)
  }

  async function handleChange(unitId, value) {
    setPriorities((prev) => ({ ...prev, [unitId]: value }))
    await supabase.from('student_unit_priorities').upsert(
      { student_id: student.id, unit_id: unitId, priority: value, is_registered: value > 0 },
      { onConflict: 'student_id,unit_id' },
    )
  }

  if (units === null) return <p className="empty-state">読み込み中...</p>

  const subjects = [...new Set(units.map((u) => u.subject))]

  return (
    <>
      <div className="page-header">
        <h1>単元登録</h1>
        <p>単元ごとの優先度を登録すると、学習の力の入れどころが一目でわかります。</p>
      </div>

      <div className="card">
        <button className="btn btn-primary" onClick={handleRecommend} disabled={aiLoading}>
          {aiLoading ? 'AIが提案を作成中...' : '🤖 AIによるおすすめ一括登録'}
        </button>
        {message && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 12 }}>{message}</p>}
      </div>

      <div className="card">
        {subjects.map((subject) => (
          <div key={subject}>
            <h3 className="unit-subject">{subject}</h3>
            {units
              .filter((u) => u.subject === subject)
              .map((u) => (
                <div key={u.id} className="unit-row">
                  <span>{u.name}</span>
                  <StarPicker value={priorities[u.id] ?? 0} onChange={(v) => handleChange(u.id, v)} />
                </div>
              ))}
          </div>
        ))}
      </div>
    </>
  )
}
