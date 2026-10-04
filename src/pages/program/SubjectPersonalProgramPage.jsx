import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loading, ErrorState, Empty, ProgressBar } from '../../components/StateViews'
import { StageIndicator } from '../../components/StageIndicator'
import { listUnits } from '../../services/units'
import { listAttempts } from '../../services/questions'
import { listWeeklyUnitResults, aggregateUnitMastery, aggregateSubjectMastery } from '../../services/grades'
import { listTargetUniversities } from '../../services/universities'
import { listMyPublishedFeedback } from '../../services/practiceSets'
import { supabase } from '../../lib/supabase'
import { PROGRAM_STAGES } from '../../lib/programStages'

const STAGE = PROGRAM_STAGES[1]

export function SubjectPersonalProgramPage({ student }) {
  const [state, setState] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [units, attempts, weeklyRecords, targets, feedback, planRes] = await Promise.all([
          listUnits(),
          listAttempts(student.id),
          listWeeklyUnitResults(student.id),
          listTargetUniversities(student.id),
          listMyPublishedFeedback(student.id),
          supabase
            .from('weekly_plans')
            .select('week_number, goal_text, change_reason, plan_tasks(id, description, is_done, estimated_hours, unit_id, units(subject, name))')
            .eq('student_id', student.id)
            .eq('status', 'confirmed')
            .order('week_number', { ascending: false })
            .limit(1),
        ])
        setState({ units, attempts, weeklyRecords, targets, feedback, latestPlan: planRes.data?.[0] ?? null })
      } catch {
        setError('読み込みに失敗しました。')
      }
    }
    load()
  }, [student.id])

  if (error) return <ErrorState message={error} />
  if (state === null) return <Loading />

  const { units, attempts, weeklyRecords, targets, feedback, latestPlan } = state
  const unitMastery = aggregateUnitMastery(weeklyRecords, attempts, units).filter((m) => m.total > 0)
  const subjectMastery = aggregateSubjectMastery(unitMastery)
  const primaryTarget = targets.find((t) => t.rank === 1) ?? targets[0] ?? null

  return (
    <>
      <div className="page-header">
        <h1>{STAGE.shortName}</h1>
        <p>{STAGE.description}</p>
        <StageIndicator currentCode={STAGE.code} />
      </div>

      <div className="card">
        <div className="section-title-row">
          <h2>志望校ごとの必要科目・出題傾向</h2>
          <Link to="/universities">志望大学へ</Link>
        </div>
        {!primaryTarget ? (
          <Empty>
            志望大学が未登録です。<Link to="/universities">志望大学ページ</Link>から登録してください。
          </Empty>
        ) : primaryTarget.university_profiles ? (
          <div>
            <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>{primaryTarget.university_profiles.name}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', whiteSpace: 'pre-line' }}>
              {primaryTarget.university_profiles.summary}
            </p>
            {primaryTarget.university_profiles.source_url && (
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                出典: <a href={primaryTarget.university_profiles.source_url} target="_blank" rel="noreferrer">{primaryTarget.university_profiles.source_url}</a>(非公式情報)
              </p>
            )}
          </div>
        ) : (
          <Empty>{primaryTarget.university_name}の大学別対策情報は未登録です。</Empty>
        )}
      </div>

      <div className="card">
        <div className="section-title-row">
          <h2>科目別の現在地</h2>
          <Link to="/grades">成績の詳細へ</Link>
        </div>
        {subjectMastery.length === 0 ? (
          <Empty>まだ演習記録がありません。</Empty>
        ) : (
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
        )}
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 12 }}>
          志望校水準(合格ラインの目安)との数値比較は現在準備中です。まずは科目別の正答率で現在地を確認してください。
        </p>
      </div>

      <div className="card">
        <div className="section-title-row">
          <h2>個別学習計画・週次タスク</h2>
          <Link to="/">ホームで詳細を見る</Link>
        </div>
        {!latestPlan ? (
          <Empty>確定済みの学習計画はまだありません。</Empty>
        ) : (
          <>
            <div className="plan-goal" style={{ marginBottom: 12 }}>
              <span className="plan-goal-label">第{latestPlan.week_number}週の目標</span>
              {latestPlan.goal_text}
            </div>
            {latestPlan.change_reason && (
              <div className="plan-goal" style={{ marginBottom: 12 }}>
                <span className="plan-goal-label">今週この計画にした理由</span>
                {latestPlan.change_reason}
              </div>
            )}
            {(latestPlan.plan_tasks ?? []).map((t) => (
              <div className="upcoming-item" key={t.id}>
                <span>{t.description}</span>
                <span>{t.is_done ? '完了' : '未完了'}</span>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="card">
        <div className="section-title-row">
          <h2>答案提出・添削結果</h2>
        </div>
        {feedback.length === 0 ? (
          <Empty>
            まだ添削結果はありません。記述式の答案は問題演習ページから解答・自己採点できます。講師による個別添削の提出機能は準備中です。
          </Empty>
        ) : (
          feedback.map((f) => (
            <div className="upcoming-item" key={f.id}>
              <span>{f.answer_submissions?.practice_set_attempts?.practice_sets?.title ?? '添削結果'}</span>
              <span>{f.score != null ? `${f.score}点` : ''}</span>
            </div>
          ))
        )}
      </div>
    </>
  )
}
