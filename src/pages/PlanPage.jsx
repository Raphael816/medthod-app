import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function TaskRow({ task, onToggle }) {
  return (
    <label className="task-row">
      <input type="checkbox" checked={task.is_done} onChange={() => onToggle(task)} />
      <div className="task-row-body">
        <span className={task.is_done ? 'task-done' : ''}>{task.description}</span>
        <div className="task-row-meta">
          {task.units?.name && <span className="unit-tag">{task.units.subject} / {task.units.name}</span>}
          {task.estimated_hours != null && <span className="hours-tag">約{task.estimated_hours}時間</span>}
        </div>
      </div>
    </label>
  )
}

function PlanCard({ plan, onToggleTask, latest }) {
  const done = plan.tasks.filter((t) => t.is_done).length
  return (
    <div className="card">
      {latest && <span className="status-pill">最新プラン</span>}
      <h2 style={{ fontSize: '1.3rem', marginBottom: 8 }}>第{plan.week_number}週のプラン</h2>
      {plan.goal_text && (
        <div className="plan-goal">
          <span className="plan-goal-label">今週の目標</span>
          {plan.goal_text}
        </div>
      )}
      {plan.tasks.length > 0 && (
        <>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '16px 0 8px' }}>
            {done} / {plan.tasks.length} 完了
          </p>
          {plan.tasks.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={onToggleTask} />
          ))}
        </>
      )}
    </div>
  )
}

export function PlanPage({ student }) {
  const [plans, setPlans] = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('weekly_plans')
      .select('id, week_number, goal_text, confirmed_at, plan_tasks(id, description, estimated_hours, is_done, sort_order, units(subject, name))')
      .eq('student_id', student.id)
      .order('week_number', { ascending: false })

    const withTasks = (data ?? []).map((p) => ({
      ...p,
      tasks: [...(p.plan_tasks ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    }))
    setPlans(withTasks)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id])

  async function handleToggleTask(task) {
    setPlans((prev) =>
      prev.map((p) => ({
        ...p,
        tasks: p.tasks.map((t) => (t.id === task.id ? { ...t, is_done: !t.is_done } : t)),
      })),
    )
    await supabase.from('plan_tasks').update({ is_done: !task.is_done }).eq('id', task.id)
  }

  if (plans === null) return <p className="empty-state">読み込み中...</p>

  if (plans.length === 0) {
    return (
      <>
        <div className="page-header">
          <h1>学習プラン</h1>
        </div>
        <div className="card empty-state">まだ確定したプランがありません。監修者の確認をお待ちください。</div>
      </>
    )
  }

  const [latest, ...history] = plans

  return (
    <>
      <div className="page-header">
        <h1>学習プラン</h1>
      </div>
      <PlanCard plan={latest} onToggleTask={handleToggleTask} latest />

      {history.length > 0 && (
        <div className="card">
          <button className="btn btn-outline btn-sm" onClick={() => setShowHistory((v) => !v)}>
            過去のプラン {showHistory ? '▲' : '▼'}
          </button>
          {showHistory &&
            history.map((plan) => (
              <div key={plan.week_number} style={{ marginTop: 20 }}>
                <h3 style={{ fontSize: '1.05rem', marginBottom: 8 }}>第{plan.week_number}週</h3>
                {plan.goal_text && (
                  <div className="plan-goal">
                    <span className="plan-goal-label">今週の目標</span>
                    {plan.goal_text}
                  </div>
                )}
                {plan.tasks.map((task) => (
                  <TaskRow key={task.id} task={task} onToggle={handleToggleTask} />
                ))}
              </div>
            ))}
        </div>
      )}
    </>
  )
}
