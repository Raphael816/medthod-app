import { useEffect, useState } from 'react'
import { LineChart } from '../components/LineChart'
import { supabase } from '../lib/supabase'
import { Loading, ErrorState, ProgressBar } from '../components/StateViews'
import { listUnits } from '../services/units'
import { listAttempts } from '../services/questions'
import { listReviewSchedules } from '../services/review'
import { aggregateUnitMastery, aggregateSubjectMastery, aggregateByQuestionType } from '../services/grades'

const PLAN_STATUS_LABEL = { confirmed: '確定済み', draft: '未生成' }

export function GradesPage({ student }) {
  const [units, setUnits] = useState(null)
  const [records, setRecords] = useState(null)
  const [attempts, setAttempts] = useState(null)
  const [reviews, setReviews] = useState(null)
  const [planStatusByWeek, setPlanStatusByWeek] = useState({})
  const [entries, setEntries] = useState({}) // unitId -> { correct, incorrect }
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setError('')
    try {
      const [unitRows, atts, revs] = await Promise.all([
        listUnits(),
        listAttempts(student.id),
        listReviewSchedules(student.id),
      ])
      setUnits(unitRows)
      setAttempts(atts)
      setReviews(revs)

      const { data: recs } = await supabase
        .from('weekly_records')
        .select('id, week_number, weekly_record_units(correct_count, incorrect_count, unit_id, units(id, subject, name))')
        .eq('student_id', student.id)
        .order('week_number')
      setRecords(recs ?? [])

      const { data: plans } = await supabase.from('weekly_plans').select('week_number, status').eq('student_id', student.id)
      const byWeek = {}
      for (const p of plans ?? []) byWeek[p.week_number] = p.status
      setPlanStatusByWeek(byWeek)
    } catch {
      setError('読み込みに失敗しました。')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id])

  if (error) return <ErrorState message={error} />
  if (units === null || records === null || attempts === null) return <Loading />

  const nextWeek = (records.reduce((max, r) => Math.max(max, r.week_number), 0) || 0) + 1
  const subjects = [...new Set(units.map((u) => u.subject))]

  const unitMastery = aggregateUnitMastery(records, attempts, units).filter((m) => m.total > 0)
  const subjectMastery = aggregateSubjectMastery(unitMastery)
  const typeMastery = aggregateByQuestionType(attempts)
  const overallTotal = unitMastery.reduce((s, m) => s + m.total, 0)
  const overallCorrect = unitMastery.reduce((s, m) => s + m.correct, 0)
  const overallAccuracy = overallTotal > 0 ? Math.round((overallCorrect / overallTotal) * 100) : null
  const weakUnits = [...unitMastery].sort((a, b) => a.accuracy - b.accuracy).slice(0, 3)

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
        <h1>成績</h1>
        <p>週次演習と確認問題の結果をもとに、単元・科目・問題形式ごとの到達度を集計しています。</p>
      </div>

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="value">{overallAccuracy != null ? `${overallAccuracy}%` : '-'}</div>
          <div className="label">総合到達度(正答率)</div>
        </div>
        <div className="stat-tile">
          <div className="value">{records.length}週</div>
          <div className="label">記録した週数</div>
        </div>
        <div className="stat-tile">
          <div className="value" style={{ fontSize: '1.1rem' }}>{weakUnits[0]?.unit.name ?? '-'}</div>
          <div className="label">最も正答率が低い単元</div>
        </div>
      </div>

      {subjectMastery.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', marginBottom: 16 }}>科目別到達度</h2>
          <div className="subject-progress-grid">
            {subjectMastery.map((s) => (
              <div className="subject-progress-item" key={s.subject}>
                <div className="subject-name">
                  <span>{s.subject}</span>
                  <span>{s.accuracy != null ? `${s.accuracy}%` : '-'}</span>
                </div>
                <ProgressBar value={s.accuracy ?? 0} max={100} />
              </div>
            ))}
          </div>
        </div>
      )}

      {typeMastery.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', marginBottom: 16 }}>問題形式別の成績</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>形式</th>
                  <th>正答数</th>
                  <th>解答数</th>
                  <th>正答率</th>
                </tr>
              </thead>
              <tbody>
                {typeMastery.map((t) => (
                  <tr key={t.type}>
                    <td>{t.type}</td>
                    <td>{t.correct}</td>
                    <td>{t.total}</td>
                    <td>{t.accuracy}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {unitMastery.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', marginBottom: 16 }}>単元別到達度</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>単元</th>
                  <th>正答数</th>
                  <th>解答数</th>
                  <th>正答率</th>
                </tr>
              </thead>
              <tbody>
                {unitMastery.map((m) => (
                  <tr key={m.unit.id}>
                    <td>{m.unit.subject} / {m.unit.name}</td>
                    <td>{m.correct}</td>
                    <td>{m.total}</td>
                    <td>{m.accuracy}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reviews && reviews.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>次に復習すべき内容</h2>
          {reviews.slice(0, 5).map((r) => (
            <div className="upcoming-item" key={r.id}>
              <span>{r.units?.name}</span>
              <span className="upcoming-date">{r.due_date}</span>
            </div>
          ))}
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
              const ru = r.weekly_record_units ?? []
              const c = ru.reduce((s, u) => s + u.correct_count, 0)
              const t = c + ru.reduce((s, u) => s + u.incorrect_count, 0)
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
