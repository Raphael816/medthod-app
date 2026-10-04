import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loading, ErrorState, Empty } from '../../components/StateViews'
import { StageIndicator } from '../../components/StageIndicator'
import { listAttempts } from '../../services/questions'
import { aggregateByQuestionType } from '../../services/grades'
import { listTargetUniversities } from '../../services/universities'
import { listMyPracticeSets, listMyPublishedFeedback } from '../../services/practiceSets'
import { listReviewSchedules } from '../../services/review'
import { LINE_URL } from '../../lib/constants'
import { PROGRAM_STAGES } from '../../lib/programStages'

const STAGE = PROGRAM_STAGES[2]

export function UniversityIntensiveProgramPage({ student }) {
  const [state, setState] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      listAttempts(student.id),
      listTargetUniversities(student.id),
      listMyPracticeSets(student.id),
      listMyPublishedFeedback(student.id, 10),
      listReviewSchedules(student.id),
    ])
      .then(([attempts, targets, practiceSets, feedback, reviews]) =>
        setState({ attempts, targets, practiceSets, feedback, reviews }),
      )
      .catch(() => setError('読み込みに失敗しました。'))
  }, [student.id])

  if (error) return <ErrorState message={error} />
  if (state === null) return <Loading />

  const { attempts, targets, practiceSets, feedback, reviews } = state
  const typeMastery = aggregateByQuestionType(attempts)

  return (
    <>
      <div className="page-header">
        <h1>{STAGE.shortName}</h1>
        <p>{STAGE.description}</p>
        <StageIndicator currentCode={STAGE.code} />
      </div>

      <div className="card">
        <div className="section-title-row">
          <h2>大学別の出題傾向・求められる解答力</h2>
          <Link to="/universities">志望大学へ</Link>
        </div>
        {targets.length === 0 ? (
          <Empty>志望大学が未登録です。</Empty>
        ) : (
          targets.map((t) => (
            <div key={t.id} style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.98rem', marginBottom: 6 }}>{t.university_name}</h3>
              {t.university_profiles ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', whiteSpace: 'pre-line' }}>
                  {t.university_profiles.summary}
                </p>
              ) : (
                <p className="empty-state" style={{ padding: 0, textAlign: 'left' }}>大学別対策情報は未登録です。</p>
              )}
            </div>
          ))
        )}
      </div>

      <div className="card">
        <div className="section-title-row">
          <h2>問題形式別の達成状況</h2>
        </div>
        {typeMastery.length === 0 ? (
          <Empty>まだ演習記録がありません。</Empty>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>形式</th><th>正答数</th><th>解答数</th><th>正答率</th></tr>
              </thead>
              <tbody>
                {typeMastery.map((t) => (
                  <tr key={t.type}>
                    <td>{t.type}</td><td>{t.correct}</td><td>{t.total}</td><td>{t.accuracy}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-title-row">
          <h2>志望校対策演習セット・過去問演習・時間制限付き演習</h2>
        </div>
        {practiceSets.length === 0 ? (
          <Empty>
            まだ演習セットは割り当てられていません。講師が志望校・出題形式に合わせたセットを順次作成します。
          </Empty>
        ) : (
          practiceSets.map((a) => (
            <div className="content-card" key={a.id} style={{ marginBottom: 12 }}>
              <div className="content-card-row">
                <div>
                  <h3>{a.practice_sets.title}</h3>
                  {a.practice_sets.description && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{a.practice_sets.description}</p>}
                </div>
                <span className="unit-status-badge status-学習中">{a.status}</span>
              </div>
              <div className="unit-meta-row">
                {a.practice_sets.subject && <span>{a.practice_sets.subject}</span>}
                {a.practice_sets.time_limit_minutes && <span>制限時間 {a.practice_sets.time_limit_minutes}分</span>}
                {a.due_date && <span>期限 {a.due_date}</span>}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <div className="section-title-row">
          <h2>答案提出・採点結果・講師添削</h2>
        </div>
        {feedback.length === 0 ? (
          <Empty>まだ添削結果はありません。</Empty>
        ) : (
          feedback.map((f) => (
            <div key={f.id} style={{ borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
              <div className="content-card-row">
                <strong>{f.answer_submissions?.practice_set_attempts?.practice_sets?.title ?? '添削結果'}</strong>
                {f.score != null && <span>{f.score}点</span>}
              </div>
              {f.feedback && <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', margin: '6px 0' }}>{f.feedback}</p>}
              {f.deduction_reasons && (
                <p style={{ fontSize: '0.82rem', color: '#b3261e', margin: '4px 0' }}>減点理由: {f.deduction_reasons}</p>
              )}
              {f.improved_answer && (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0' }}>改善答案例: {f.improved_answer}</p>
              )}
            </div>
          ))
        )}
      </div>

      <div className="card">
        <div className="section-title-row">
          <h2>復習対象問題・再演習</h2>
          <Link to="/study/review">復習ページへ</Link>
        </div>
        {reviews.length === 0 ? (
          <Empty>現在、復習予定の問題はありません。</Empty>
        ) : (
          reviews.slice(0, 5).map((r) => (
            <div className="upcoming-item" key={r.id}>
              <span>{r.units?.name}</span>
              <span>{r.due_date}</span>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <div className="section-title-row">
          <h2>直前期カレンダー</h2>
        </div>
        <Empty>外部英語試験・出願・模擬試験を含む直前期カレンダーは今後のアップデートで対応予定です。</Empty>
      </div>

      <div className="card">
        <div className="section-title-row">
          <h2>志望理由書・面接対策</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 12 }}>
          志望理由書の添削・面接練習は、講師との個別のやり取りで進めます。日程のご相談はLINEから承っています。
        </p>
        <a className="btn btn-outline btn-sm" href={LINE_URL} target="_blank" rel="noreferrer">
          LINEで相談する
        </a>
      </div>
    </>
  )
}
