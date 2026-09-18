import { useEffect, useState } from 'react'
import { LineChart } from '../components/LineChart'
import { Tilt } from '../components/Tilt'
import { supabase } from '../lib/supabase'

const PLAN_STATUS_LABEL = { confirmed: '確定済み', draft: '未生成' }

export function GradesPage({ student }) {
  const [units, setUnits] = useState(null)
  const [records, setRecords] = useState(null)
  const [planStatusByWeek, setPlanStatusByWeek] = useState({})
  const [entries, setEntries] = useState({}) // unitId -> { correct, incorrect }
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    const { data: unitRows } = await supabase.from('units').select('id, subject, name').order('sort_order')
    setUnits(unitRows ?? [])

    const { data: recs } = await supabase
      .from('weekly_records')
      .select('id, week_number, weekly_record_units(correct_count, incorrect_count, units(id, subject, name))')
      .eq('student_id', student.id)
      .order('week_number')
    setRecords(recs ?? [])

    const { data: plans } = await supabase
      .from('weekly_plans')
      .select('week_number, status')
      .eq('student_id', student.id)
    const byWeek = {}
    for (const p of plans ?? []) byWeek[p.week_number] = p.status
    setPlanStatusByWeek(byWeek)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id])

  if (units === null || records === null) return <p className="empty-state">読み込み中...</p>

  const nextWeek = (records.reduce((max, r) => Math.max(max, r.week_number), 0) || 0) + 1
  const subjects = [...new Set(units.map((u) => u.subject))]

  const allUnitResults = records.flatMap((r) => r.weekly_record_units ?? [])
  const totalCorrect = allUnitResults.reduce((s, r) => s + r.correct_count, 0)
  const totalIncorrect = allUnitResults.reduce((s, r) => s + r.incorrect_count, 0)
  const total = totalCorrect + totalIncorrect
  const overallAccuracy = total > 0 ? `${Math.round((totalCorrect / total) * 100)}%` : '-'

  const unitTotals = new Map()
  for (const r of allUnitResults) {
    const key = r.units?.name ?? '不明'
    const t = unitTotals.get(key) ?? { correct: 0, incorrect: 0 }
    t.correct += r.correct_count
    t.incorrect += r.incorrect_count
    unitTotals.set(key, t)
  }
  const topWeakUnit =
    [...unitTotals.entries()]
      .filter(([, t]) => t.correct + t.incorrect > 0)
      .sort((a, b) => a[1].correct / (a[1].correct + a[1].incorrect) - b[1].correct / (b[1].correct + b[1].incorrect))[0]?.[0] ?? '-'

  function toggleUnit(unitId) {
    setEntries((prev) => {
      const next = { ...prev }
      if (next[unitId]) delete next[unitId]
      else next[unitId] = { correct: 0, incorrect: 0 }
      return next
    })
  }

  function setCount(unitId, field, value) {
    setEntries((prev) => ({ ...prev, [unitId]: { ...prev[unitId], [field]: value } }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const { data: record, error: recErr } = await supabase
      .from('weekly_records')
      .insert({ student_id: student.id, week_number: nextWeek })
      .select()
      .single()

    if (recErr) {
      setSaving(false)
      setMessage('記録に失敗しました。すでに記録済みの週の可能性があります。')
      return
    }

    const rows = Object.entries(entries).map(([unitId, counts]) => ({
      weekly_record_id: record.id,
      unit_id: unitId,
      correct_count: Number(counts.correct) || 0,
      incorrect_count: Number(counts.incorrect) || 0,
    }))
    if (rows.length) {
      const { error: unitErr } = await supabase.from('weekly_record_units').insert(rows)
      if (unitErr) {
        setSaving(false)
        setMessage('単元ごとの結果の保存に失敗しました。')
        return
      }
    }

    setSaving(false)
    setMessage(`第${nextWeek}週の記録を保存しました。監修者が確認後、翌週のプランに反映されます。`)
    setEntries({})
    load()
  }

  const selectedCount = Object.keys(entries).length

  return (
    <>
      <div className="page-header">
        <h1>成績管理</h1>
      </div>

      {records.length > 0 && (
        <div className="stat-grid">
          <Tilt className="stat-tile">
            <div className="value">{records.length}週</div>
            <div className="label">記録した週数</div>
          </Tilt>
          <Tilt className="stat-tile">
            <div className="value">{overallAccuracy}</div>
            <div className="label">通算正答率</div>
          </Tilt>
          <Tilt className="stat-tile">
            <div className="value" style={{ fontSize: '1.1rem' }}>{topWeakUnit}</div>
            <div className="label">最も正答率が低い単元</div>
          </Tilt>
        </div>
      )}

      <div className="card">
        <h2 style={{ fontSize: '1.15rem', marginBottom: 8 }}>第{nextWeek}週の演習結果を記録する</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
          今週演習した単元にチェックを入れて、正答数・誤答数を入力してください。
        </p>
        <form onSubmit={handleSubmit}>
          {subjects.map((subject) => (
            <div key={subject} style={{ marginBottom: 16 }}>
              <h3 className="unit-subject">{subject}</h3>
              {units
                .filter((u) => u.subject === subject)
                .map((u) => (
                  <div key={u.id} className="unit-row">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                      <input type="checkbox" checked={!!entries[u.id]} onChange={() => toggleUnit(u.id)} />
                      {u.name}
                    </label>
                    {entries[u.id] && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="number"
                          min="0"
                          placeholder="正答"
                          style={{ width: 64 }}
                          value={entries[u.id].correct}
                          onChange={(e) => setCount(u.id, 'correct', e.target.value)}
                        />
                        <input
                          type="number"
                          min="0"
                          placeholder="誤答"
                          style={{ width: 64 }}
                          value={entries[u.id].incorrect}
                          onChange={(e) => setCount(u.id, 'incorrect', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                ))}
            </div>
          ))}
          {message && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>{message}</p>}
          <button className="btn btn-primary" type="submit" disabled={saving || selectedCount === 0}>
            {saving ? '記録中...' : `${selectedCount}件の単元を記録する`}
          </button>
        </form>
      </div>

      {records.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: '1.15rem', marginBottom: 16 }}>正答率の推移</h2>
          <LineChart
            labels={records.map((r) => `第${r.week_number}週`)}
            values={records.map((r) => {
              const units = r.weekly_record_units ?? []
              const c = units.reduce((s, u) => s + u.correct_count, 0)
              const t = c + units.reduce((s, u) => s + u.incorrect_count, 0)
              return t > 0 ? (c / t) * 100 : 0
            })}
          />
        </div>
      )}

      {records.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: '1.15rem', marginBottom: 16 }}>これまでの記録・プラン状況</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>週</th>
                  <th>正答数</th>
                  <th>誤答数</th>
                  <th>演習した単元</th>
                  <th>翌週プラン</th>
                </tr>
              </thead>
              <tbody>
                {[...records].reverse().map((r) => {
                  const ru = r.weekly_record_units ?? []
                  const c = ru.reduce((s, u) => s + u.correct_count, 0)
                  const ic = ru.reduce((s, u) => s + u.incorrect_count, 0)
                  return (
                    <tr key={r.week_number}>
                      <td>第{r.week_number}週</td>
                      <td>{c}</td>
                      <td>{ic}</td>
                      <td>{ru.map((u) => u.units?.name).filter(Boolean).join('、') || '-'}</td>
                      <td>{PLAN_STATUS_LABEL[planStatusByWeek[r.week_number + 1]] ?? '未生成'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
