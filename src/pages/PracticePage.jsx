import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Loading, ErrorState, Empty } from '../components/StateViews'
import { listUnits, listStudentUnits } from '../services/units'
import { listQuestionsByUnit, listAttempts, submitAnswer, submitSelfAssessment } from '../services/questions'
import { scheduleReview } from '../services/review'

const SELF_ASSESS_TYPES = ['記述問題', '小論文', '英文読解', '実験考察', 'グラフ読解']

function PracticeSelector({ student }) {
  const [state, setState] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([listUnits(), listStudentUnits(student.id), listAttempts(student.id)])
      .then(([units, studentUnits, attempts]) => setState({ units, studentUnits, attempts }))
      .catch(() => setError('読み込みに失敗しました。'))
  }, [student.id])

  if (error) return <ErrorState message={error} />
  if (state === null) return <Loading />

  const unitsById = Object.fromEntries(state.units.map((u) => [u.id, u]))
  const registered = state.studentUnits.filter((su) => su.is_registered && unitsById[su.unit_id])
  const wrongAttempts = state.attempts.filter((a) => a.is_correct === false)
  const wrongUnitIds = [...new Set(wrongAttempts.map((a) => a.questions?.unit_id).filter(Boolean))]

  return (
    <>
      <div className="page-header">
        <h1>問題演習</h1>
        <p>単元別問題・弱点復習・間違えた問題から選んで演習できます。</p>
      </div>

      {wrongUnitIds.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: '1.05rem', marginBottom: 10 }}>間違えた問題がある単元</h2>
          <div className="unit-meta-row">
            {wrongUnitIds.map((id) => (
              <Link key={id} to={`/practice/${id}`} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 12px' }}>
                {unitsById[id]?.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ fontSize: '1.05rem', marginBottom: 10 }}>単元別問題</h2>
        {registered.length === 0 ? (
          <Empty>
            まだ単元を登録していません。<Link to="/study/units/add">単元を追加</Link>してください。
          </Empty>
        ) : (
          <div className="unit-grid">
            {registered.map((su) => {
              const unit = unitsById[su.unit_id]
              return (
                <div className="unit-card" key={su.id}>
                  <div className="unit-card-header">
                    <div>
                      <div className="subject-label">{unit.subject}</div>
                      <h3>{unit.name}</h3>
                    </div>
                    <span className={`unit-status-badge status-${su.status}`}>{su.status}</span>
                  </div>
                  <div className="unit-card-actions">
                    <Link className="btn btn-primary btn-sm" to={`/practice/${unit.id}`}>
                      演習する
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="card empty-state">
        大学別問題・模擬試験は今後追加予定です。
      </div>
    </>
  )
}

function PracticeSession({ student, unitId }) {
  const navigate = useNavigate()
  const [units, setUnits] = useState(null)
  const [questions, setQuestions] = useState(null)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [textAnswer, setTextAnswer] = useState('')
  const [attempt, setAttempt] = useState(null)
  const [error, setError] = useState('')
  const [sessionResults, setSessionResults] = useState([])

  useEffect(() => {
    Promise.all([listUnits(), listQuestionsByUnit(unitId)])
      .then(([u, q]) => {
        setUnits(u)
        setQuestions(q)
        setIndex(0)
        setAttempt(null)
        setSelected(null)
        setTextAnswer('')
        setSessionResults([])
      })
      .catch(() => setError('問題の読み込みに失敗しました。'))
  }, [unitId])

  const unit = useMemo(() => units?.find((u) => u.id === unitId), [units, unitId])
  const question = questions?.[index]

  async function handleSubmit() {
    const answer = question.choices ? selected : textAnswer
    if (!answer) return
    const saved = await submitAnswer(student.id, question, answer)
    setAttempt(saved)
    setSessionResults((prev) => [...prev, saved])
    if (saved.is_correct === false) {
      await scheduleReview(student.id, unitId, `${question.prompt.slice(0, 30)}… を間違えた`)
    }
  }

  async function handleSelfAssess(isCorrect) {
    await submitSelfAssessment(attempt.id, isCorrect)
    setAttempt({ ...attempt, is_correct: isCorrect })
    setSessionResults((prev) => prev.map((r) => (r.id === attempt.id ? { ...r, is_correct: isCorrect } : r)))
    if (!isCorrect) await scheduleReview(student.id, unitId, `${question.prompt.slice(0, 30)}… を間違えた`)
  }

  function handleNext() {
    setIndex((i) => i + 1)
    setAttempt(null)
    setSelected(null)
    setTextAnswer('')
  }

  if (error) return <ErrorState message={error} />
  if (questions === null) return <Loading />
  if (!unit) return <ErrorState message="単元が見つかりません。" />

  if (questions.length === 0) {
    return (
      <>
        <div className="page-header">
          <p style={{ marginBottom: 4 }}>
            <Link to="/practice">← 問題演習</Link>
          </p>
          <h1>{unit.name}</h1>
        </div>
        <Empty>この単元の確認問題はまだありません。</Empty>
      </>
    )
  }

  if (index >= questions.length) {
    const correctCount = sessionResults.filter((r) => r.is_correct === true).length
    const gradedCount = sessionResults.filter((r) => r.is_correct !== null).length
    return (
      <>
        <div className="page-header">
          <h1>演習結果</h1>
        </div>
        <div className="card">
          <p>
            {unit.name}: {gradedCount > 0 ? `${correctCount} / ${gradedCount} 問正解` : `${sessionResults.length}問に解答しました`}
          </p>
          <div className="unit-card-actions" style={{ marginTop: 16 }}>
            <Link className="btn btn-outline btn-sm" to={`/study/units/${unitId}`}>
              単元の詳細へ
            </Link>
            <Link className="btn btn-primary btn-sm" to="/grades">
              成績を確認する
            </Link>
            <button className="btn btn-outline btn-sm" onClick={() => navigate(0)}>
              もう一度解く
            </button>
          </div>
        </div>
      </>
    )
  }

  const needsSelfAssess = attempt && SELF_ASSESS_TYPES.includes(question.type)

  return (
    <>
      <div className="page-header">
        <p style={{ marginBottom: 4 }}>
          <Link to="/practice">← 問題演習</Link>
        </p>
        <h1>{unit.name}</h1>
        <p>
          第{index + 1}問 / 全{questions.length}問
        </p>
      </div>

      <div className="question-card">
        <span className="question-type-tag">{question.type}</span>
        <p className="question-prompt">{question.prompt}</p>

        {!attempt && question.choices && (
          <div className="choice-list">
            {question.choices.map((c) => (
              <button
                key={c}
                className={selected === c ? 'choice-button selected' : 'choice-button'}
                onClick={() => setSelected(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        {!attempt && !question.choices && (
          <textarea rows={3} value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)} placeholder="解答を入力" />
        )}
        {!attempt && (
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleSubmit}>
            解答する
          </button>
        )}

        {attempt && (
          <>
            {needsSelfAssess && attempt.is_correct === null ? (
              <div className="result-banner pending">自己採点してください</div>
            ) : (
              <div className={`result-banner ${attempt.is_correct ? 'correct' : 'incorrect'}`}>
                {attempt.is_correct ? '正解' : '不正解'}
              </div>
            )}
            <div className="explanation-box">
              <strong>正答・解説:</strong> {question.correct_answer}
              <br />
              {question.explanation}
            </div>
            {needsSelfAssess && attempt.is_correct === null && (
              <div className="unit-card-actions" style={{ marginTop: 12 }}>
                <button className="btn btn-outline btn-sm" onClick={() => handleSelfAssess(true)}>
                  できていた
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => handleSelfAssess(false)}>
                  できていなかった
                </button>
              </div>
            )}
            {(!needsSelfAssess || attempt.is_correct !== null) && (
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleNext}>
                次の問題へ
              </button>
            )}
          </>
        )}
      </div>
    </>
  )
}

export function PracticePage({ student }) {
  const { unitId } = useParams()
  if (unitId) return <PracticeSession student={student} unitId={unitId} />
  return <PracticeSelector student={student} />
}
