import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Loading, ErrorState, Empty } from '../components/StateViews'
import {
  getAssignmentForTaking, getMyLatestAttempt, startAttempt, listSubmissionsForAttempt, saveAnswer, submitAttempt,
} from '../services/practiceSets'

const ASSIGNMENT_STATUS_LABEL = { assigned: '未着手', in_progress: '取組中', submitted: '提出済み', reviewed: '採点済み' }

function formatClock(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function PracticeSetTakingPage({ student }) {
  const { assignmentId } = useParams()
  const navigate = useNavigate()
  const [assignment, setAssignment] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [answers, setAnswers] = useState({})
  const [savedAt, setSavedAt] = useState({})
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(null)
  const autoSubmitRef = useRef(false)

  async function load() {
    setError('')
    try {
      const a = await getAssignmentForTaking(assignmentId, student.id)
      if (!a.practice_sets) {
        setError('この演習セットは現在公開されていません。')
        return
      }
      setAssignment(a)
      const latest = await getMyLatestAttempt(a.practice_sets.id, student.id)
      setAttempt(latest)
      if (latest && latest.status === 'in_progress') {
        const subs = await listSubmissionsForAttempt(latest.id)
        setAnswers(Object.fromEntries(Object.entries(subs).map(([qId, s]) => [qId, s.answer_text ?? ''])))
      }
    } catch {
      setError('読み込みに失敗しました。')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId])

  const handleSubmit = useCallback(async () => {
    if (!attempt || submitting) return
    setSubmitting(true)
    try {
      const startedAt = new Date(attempt.started_at).getTime()
      const timeSpent = Math.round((Date.now() - startedAt) / 1000)
      await submitAttempt(attempt.id, assignment.id, timeSpent)
      navigate('/program/university-intensive')
    } catch {
      setError('提出に失敗しました。時間をおいて再度お試しください。')
    }
    setSubmitting(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, assignment, submitting])

  // 制限時間のカウントダウン・自動提出
  useEffect(() => {
    if (!attempt || attempt.status !== 'in_progress' || !assignment?.practice_sets?.time_limit_minutes) {
      setRemainingSeconds(null)
      return
    }
    const deadline = new Date(attempt.started_at).getTime() + assignment.practice_sets.time_limit_minutes * 60 * 1000
    const tick = () => {
      const remain = Math.max(0, Math.round((deadline - Date.now()) / 1000))
      setRemainingSeconds(remain)
      if (remain <= 0 && !autoSubmitRef.current) {
        autoSubmitRef.current = true
        handleSubmit()
      }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [attempt, assignment, handleSubmit])

  if (error) return <ErrorState message={error} />
  if (assignment === null) return <Loading />

  const practiceSet = assignment.practice_sets

  async function handleStart() {
    setStarting(true)
    try {
      const newAttempt = await startAttempt(practiceSet.id, student.id, assignment.id)
      setAttempt(newAttempt)
      setAnswers({})
    } catch {
      setError('開始に失敗しました。時間をおいて再度お試しください。')
    }
    setStarting(false)
  }

  async function handleSaveAnswer(questionId) {
    try {
      await saveAnswer(attempt.id, questionId, answers[questionId] ?? '')
      setSavedAt((prev) => ({ ...prev, [questionId]: new Date().toLocaleTimeString('ja-JP') }))
    } catch {
      setError('解答の保存に失敗しました。時間をおいて再度お試しください。')
    }
  }

  const alreadySubmitted = assignment.status === 'submitted' || assignment.status === 'reviewed'
  const inProgress = attempt && attempt.status === 'in_progress'

  return (
    <>
      <div className="page-header">
        <p style={{ marginBottom: 4 }}>
          <Link to="/program/university-intensive">← 完全個別プログラム 志望校対策講座</Link>
        </p>
        <h1>{practiceSet.title}</h1>
        {practiceSet.description && <p>{practiceSet.description}</p>}
        <span className="status-pill">{ASSIGNMENT_STATUS_LABEL[assignment.status] ?? assignment.status}</span>
      </div>

      {!attempt && !alreadySubmitted && (
        <div className="card">
          <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
            {practiceSet.time_limit_minutes
              ? `制限時間は${practiceSet.time_limit_minutes}分です。開始すると時間の計測が始まります。`
              : '制限時間の指定はありません。'}
          </p>
          <button className="btn btn-primary" onClick={handleStart} disabled={starting}>
            {starting ? '準備中...' : '開始する'}
          </button>
        </div>
      )}

      {alreadySubmitted && !inProgress && (
        <div className="card">
          <p style={{ marginBottom: 12 }}>この演習セットは提出済みです。採点・添削結果は完全個別プログラム 志望校対策講座ページでご確認いただけます。</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link className="btn btn-outline btn-sm" to="/program/university-intensive">採点結果を見る</Link>
            <button className="btn btn-outline btn-sm" onClick={handleStart} disabled={starting}>
              {starting ? '準備中...' : 'もう一度解く(再演習)'}
            </button>
          </div>
        </div>
      )}

      {inProgress && (
        <>
          {remainingSeconds != null && (
            <div className={`card timer-banner ${remainingSeconds <= 60 ? 'warn' : ''}`}>
              残り時間: <strong>{formatClock(remainingSeconds)}</strong>
              {remainingSeconds <= 60 && <span> ・ まもなく自動的に提出されます</span>}
            </div>
          )}
          {assignment.questions.length === 0 ? (
            <Empty>この演習セットにはまだ問題が登録されていません。</Empty>
          ) : (
            assignment.questions.map((pq, i) => {
              const q = pq.questions
              return (
                <div className="question-card" key={q.id}>
                  <span className="question-type-tag">第{i + 1}問 ・ {q.type}</span>
                  <p className="question-prompt">{q.prompt}</p>
                  <textarea
                    rows={5}
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="解答を入力してください"
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => handleSaveAnswer(q.id)}>
                      この解答を保存
                    </button>
                    {savedAt[q.id] && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{savedAt[q.id]} に保存済み</span>}
                  </div>
                </div>
              )
            })
          )}
          <div className="card">
            <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginBottom: 12 }}>
              提出すると、解答の変更はできなくなります。保存し忘れた解答がないか確認してください。
            </p>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? '提出中...' : 'すべて提出する'}
            </button>
          </div>
        </>
      )}
    </>
  )
}
