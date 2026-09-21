import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loading, ErrorState, ProgressBar } from '../components/StateViews'
import { listUnits, listStudentUnits } from '../services/units'
import { listMaterials, listMaterialProgress } from '../services/materials'
import { listVideos, listVideoProgress } from '../services/videos'
import { listAttempts } from '../services/questions'
import { listReviewSchedules } from '../services/review'
import { listTargetUniversities } from '../services/universities'
import { aggregateUnitMastery, aggregateSubjectMastery } from '../services/grades'
import { supabase } from '../lib/supabase'
import { useEntitlements } from '../context/EntitlementsContext'

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function classifyTaskType(description) {
  if (/動画/.test(description)) return 'video'
  if (/教材|読|精読/.test(description)) return 'material'
  if (/復習/.test(description)) return 'review'
  if (/出願|志望理由|自己推薦/.test(description)) return 'application'
  return 'question'
}

const TASK_TYPE_LABEL = { material: '教材', video: '動画', question: '問題', review: '復習', application: '出願準備' }

export function HomePage({ student }) {
  const [state, setState] = useState(null)
  const [error, setError] = useState('')
  const [showPlanHistory, setShowPlanHistory] = useState(false)
  const { loading: entitlementsLoading, activeProgram } = useEntitlements()

  useEffect(() => {
    async function load() {
      try {
        const [
          units,
          studentUnits,
          materials,
          materialProgress,
          videos,
          videoProgress,
          attempts,
          reviews,
          targets,
          weeklyRecordsRes,
          latestPlanRes,
        ] = await Promise.all([
          listUnits(),
          listStudentUnits(student.id),
          listMaterials(),
          listMaterialProgress(student.id),
          listVideos(),
          listVideoProgress(student.id),
          listAttempts(student.id),
          listReviewSchedules(student.id),
          listTargetUniversities(student.id),
          supabase
            .from('weekly_records')
            .select('week_number, weekly_record_units(correct_count, incorrect_count, unit_id, units(subject))')
            .eq('student_id', student.id)
            .order('week_number'),
          supabase
            .from('weekly_plans')
            .select('id, week_number, goal_text, change_reason, plan_tasks(id, description, is_done, estimated_hours, unit_id, units(subject, name))')
            .eq('student_id', student.id)
            .eq('status', 'confirmed')
            .order('week_number', { ascending: false }),
        ])

        setState({
          units,
          studentUnits,
          materials,
          materialProgress,
          videos,
          videoProgress,
          attempts,
          reviews,
          targets,
          weeklyRecords: weeklyRecordsRes.data ?? [],
          plans: latestPlanRes.data ?? [],
        })
      } catch {
        setError('ホーム画面の読み込みに失敗しました。')
      }
    }
    load()
  }, [student.id])

  if (error) return <ErrorState message={error} />
  if (state === null) return <Loading />

  const { units, studentUnits, materials, materialProgress, videos, videoProgress, attempts, reviews, targets, weeklyRecords, plans } = state
  const [latestPlan, ...planHistory] = plans

  async function toggleTask(taskId, current) {
    setState((prev) => ({
      ...prev,
      plans: prev.plans.map((p) => ({
        ...p,
        plan_tasks: p.plan_tasks.map((t) => (t.id === taskId ? { ...t, is_done: !current } : t)),
      })),
    }))
    await supabase.from('plan_tasks').update({ is_done: !current }).eq('id', taskId)
  }

  const registeredUnits = studentUnits.filter((su) => su.is_registered)
  const statusCounts = {
    未着手: registeredUnits.filter((su) => su.status === '未着手').length,
    学習中: registeredUnits.filter((su) => su.status === '学習中').length,
    復習中: registeredUnits.filter((su) => su.status === '復習中').length,
  }
  const masteredCount = registeredUnits.filter((su) => su.status === '習得済み').length
  const materialsCompleted = materials.filter((m) => materialProgress[m.id]?.is_completed).length
  const videoWatchSeconds = videos.reduce((sum, v) => {
    const ratio = (videoProgress[v.id]?.watched_ratio ?? 0) / 100
    return sum + v.duration_seconds * ratio
  }, 0)

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const recentAttempts = attempts.filter((a) => new Date(a.created_at) >= weekAgo && a.is_correct !== null)
  const recentCorrect = recentAttempts.filter((a) => a.is_correct).length
  const weeklyAccuracy = recentAttempts.length > 0 ? Math.round((recentCorrect / recentAttempts.length) * 100) : null
  // 学習時間の実測はまだ無いため、確認問題1問あたり3分・動画視聴分数を合算した概算値として示す(要改善)
  const estimatedWeeklyMinutes = recentAttempts.length * 3 + Math.round(videoWatchSeconds / 60)
  const weeklyGoalMinutes = 300

  const examDays = daysUntil(student.exam_date)
  const primaryTarget = targets.find((t) => t.rank === 1)?.university_name ?? student.target_university

  const unitMastery = aggregateUnitMastery(weeklyRecords, attempts, units).filter((m) => m.total > 0)
  const subjectMastery = aggregateSubjectMastery(unitMastery)

  // 科目別の「先週からの変化」: weekly_records の最新週と直前週を比較する(データが2週未満なら算出しない)
  const weekNumbers = [...new Set(weeklyRecords.map((r) => r.week_number))].sort((a, b) => a - b)
  const lastWeek = weekNumbers[weekNumbers.length - 1]
  const prevWeek = weekNumbers[weekNumbers.length - 2]
  function subjectAccuracyForWeek(week, subject) {
    const rec = weeklyRecords.find((r) => r.week_number === week)
    if (!rec) return null
    const rows = (rec.weekly_record_units ?? []).filter((ru) => ru.units?.subject === subject)
    const c = rows.reduce((s, r) => s + r.correct_count, 0)
    const t = c + rows.reduce((s, r) => s + r.incorrect_count, 0)
    return t > 0 ? Math.round((c / t) * 100) : null
  }

  const overallProgress = registeredUnits.length > 0 ? Math.round((masteredCount / registeredUnits.length) * 100) : 0

  const todayTasks = [
    ...(latestPlan?.plan_tasks ?? []).map((t) => ({
      id: t.id,
      title: t.description,
      type: classifyTaskType(t.description),
      subject: t.units ? `${t.units.subject} / ${t.units.name}` : null,
      hours: t.estimated_hours,
      done: t.is_done,
      unitId: t.unit_id,
      href: t.unit_id ? `/study/units/${t.unit_id}` : '/practice',
      isPlanTask: true,
    })),
    ...reviews.map((r) => ({
      id: `review-${r.id}`,
      title: `${r.units?.name ?? ''}の復習`,
      type: 'review',
      subject: r.units?.subject,
      hours: null,
      done: false,
      dueDate: r.due_date,
      href: r.question_id ? `/practice/${r.unit_id}?question=${r.question_id}` : `/study/units/${r.unit_id}`,
      isPlanTask: false,
    })),
  ]

  const weakUnits = [...unitMastery].sort((a, b) => a.accuracy - b.accuracy).slice(0, 2)

  return (
    <>
      <div className="home-header">
        <div className="home-header-top">
          <div>
            <h1>{student.name} さん、おかえりなさい</h1>
            <p>
              第一志望: {primaryTarget || '未登録'} {student.exam_date && `・受験予定: ${student.exam_date}`}
            </p>
            {!entitlementsLoading && (
              <p className="home-program-badge">
                現在受講中のプログラム:{' '}
                {activeProgram ? <strong>{activeProgram.name}</strong> : '受講中のプログラムが登録されていません(監修者にお問い合わせください)'}
              </p>
            )}
          </div>
        </div>
        <div className="home-stat-row">
          <div className="home-stat">
            <div className={`value ${examDays != null && examDays <= 30 ? 'warn' : ''}`}>{examDays != null ? `${examDays}日` : '-'}</div>
            <div className="label">試験日までの残り</div>
          </div>
          <div className="home-stat">
            <div className="value">{Math.round(estimatedWeeklyMinutes / 60)}時間</div>
            <div className="label">今週の学習時間(概算)</div>
          </div>
          <div className="home-stat">
            <div className="value">{Math.round(weeklyGoalMinutes / 60)}時間</div>
            <div className="label">週間目標時間</div>
          </div>
          <div className="home-stat">
            <div className="value">{overallProgress}%</div>
            <div className="label">全体進捗率(登録単元中の習得率)</div>
          </div>
        </div>
      </div>

      <div className="section-title-row">
        <h2>今日やること</h2>
      </div>
      {latestPlan?.goal_text && (
        <div className="plan-goal" style={{ marginBottom: 16 }}>
          <span className="plan-goal-label">第{latestPlan.week_number}週の目標</span>
          {latestPlan.goal_text}
        </div>
      )}
      {latestPlan?.change_reason && (
        <div className="plan-goal" style={{ marginBottom: 16 }}>
          <span className="plan-goal-label">今週この計画にした理由</span>
          {latestPlan.change_reason}
        </div>
      )}
      {todayTasks.length === 0 ? (
        <div className="card empty-state">
          今日のタスクはありません。<Link to="/study/units/add">単元を追加</Link>して学習を始めましょう。
        </div>
      ) : (
        todayTasks.map((t) => (
          <div className={t.done ? 'today-task-item done' : 'today-task-item'} key={t.id}>
            {t.isPlanTask && (
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggleTask(t.id, t.done)}
                aria-label={`${t.title}を完了にする`}
                style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0 }}
              />
            )}
            <div className="task-main">
              <div className={t.done ? 'task-title done' : 'task-title'}>
                <span className={`task-type-badge ${t.type}`}>{TASK_TYPE_LABEL[t.type]}</span>
                {t.title}
              </div>
              <div className="task-meta-line">
                {t.subject && <span>{t.subject}</span>}
                {t.hours != null && <span>約{t.hours}時間</span>}
                {t.dueDate && <span className={t.dueDate <= new Date().toISOString().slice(0, 10) ? 'overdue' : ''}>期限 {t.dueDate}</span>}
              </div>
            </div>
            {!t.done && (
              <Link className="btn btn-outline btn-sm" to={t.href}>
                開始する
              </Link>
            )}
          </div>
        ))
      )}
      {planHistory.length > 0 && (
        <div className="card">
          <button className="btn btn-outline btn-sm" onClick={() => setShowPlanHistory((v) => !v)}>
            過去のプラン {showPlanHistory ? '▲' : '▼'}
          </button>
          {showPlanHistory &&
            planHistory.map((p) => (
              <div key={p.id} style={{ marginTop: 20 }}>
                <h3 style={{ fontSize: '1.05rem', marginBottom: 8 }}>第{p.week_number}週</h3>
                {p.goal_text && (
                  <div className="plan-goal">
                    <span className="plan-goal-label">今週の目標</span>
                    {p.goal_text}
                  </div>
                )}
                {p.change_reason && (
                  <p style={{ margin: '10px 0', color: 'var(--text-muted)' }}>
                    計画の理由: {p.change_reason}
                  </p>
                )}
                {p.plan_tasks.map((task) => (
                  <label className="task-row" key={task.id}>
                    <input type="checkbox" checked={task.is_done} onChange={() => toggleTask(task.id, task.is_done)} />
                    <div className="task-row-body">
                      <span className={task.is_done ? 'task-done' : ''}>{task.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            ))}
        </div>
      )}


      <div className="card">
        <div className="section-title-row">
          <h2>学習進捗</h2>
        </div>
        <div className="stat-grid">
          <div className="stat-tile">
            <div className="value">{registeredUnits.length}</div>
            <div className="label">登録単元数</div>
          </div>
          <div className="stat-tile">
            <div className="value">{masteredCount}</div>
            <div className="label">習得済み単元数</div>
          </div>
          <div className="stat-tile">
            <div className="value">{statusCounts.学習中}</div>
            <div className="label">学習中の単元数</div>
          </div>
          <div className="stat-tile">
            <div className="value">{statusCounts.未着手}</div>
            <div className="label">未着手単元数</div>
          </div>
          <div className="stat-tile">
            <div className="value">{materialsCompleted}</div>
            <div className="label">教材完了数</div>
          </div>
          <div className="stat-tile">
            <div className="value">{Math.round(videoWatchSeconds / 60)}分</div>
            <div className="label">動画視聴時間</div>
          </div>
          <div className="stat-tile">
            <div className="value">{weeklyAccuracy != null ? `${weeklyAccuracy}%` : '-'}</div>
            <div className="label">今週の問題正答率</div>
          </div>
        </div>
      </div>

      {subjectMastery.length > 0 && (
        <div className="card">
          <div className="section-title-row">
            <h2>科目別の現在地</h2>
            <Link to="/grades">成績の詳細へ</Link>
          </div>
          <div className="subject-progress-grid">
            {subjectMastery.map((s) => {
              const cur = lastWeek != null ? subjectAccuracyForWeek(lastWeek, s.subject) : null
              const prev = prevWeek != null ? subjectAccuracyForWeek(prevWeek, s.subject) : null
              const delta = cur != null && prev != null ? cur - prev : null
              return (
                <div className="subject-progress-item" key={s.subject}>
                  <div className="subject-name">
                    <span>{s.subject}</span>
                    <span>{s.accuracy != null ? `${s.accuracy}%` : '-'}</span>
                  </div>
                  <ProgressBar value={s.accuracy ?? 0} max={100} />
                  <div className={`subject-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`}>
                    {delta != null ? `先週比 ${delta > 0 ? '+' : ''}${delta}pt` : '先週比データ不足'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="card">
        <div className="section-title-row">
          <h2>直近の予定</h2>
        </div>
        {student.exam_date ? (
          <div className="upcoming-item">
            <span>本試験</span>
            <span className={examDays != null && examDays <= 30 ? 'upcoming-date soon' : 'upcoming-date'}>{student.exam_date}</span>
          </div>
        ) : (
          <p className="empty-state">試験予定日が未登録です。マイページから登録してください。</p>
        )}
        {reviews.slice(0, 3).map((r) => (
          <div className="upcoming-item" key={r.id}>
            <span>{r.units?.name} の復習</span>
            <span className="upcoming-date">{r.due_date}</span>
          </div>
        ))}
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8 }}>
          外部英語試験・出願・模擬試験の日程管理は今後のアップデートで対応予定です。
        </p>
      </div>

      <div className="card">
        <div className="section-title-row">
          <h2>学習提案</h2>
        </div>
        {weakUnits.length === 0 ? (
          <p className="empty-state">まだ提案できるデータがありません。確認問題や演習記録を増やしてください。</p>
        ) : (
          weakUnits.map((m) => (
            <div className="suggestion-card" key={m.unit.id}>
              {m.unit.name}の確認問題の正答率が{m.accuracy}%です。関連教材を復習し、間違えた問題を解き直しましょう。
              <div className="suggestion-basis">根拠: 直近の演習・確認問題 {m.total}件中正解{m.correct}件</div>
              <div className="suggestion-action">
                <Link to={`/study/units/${m.unit.id}`}>→ {m.unit.name}の教材を見る</Link>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
