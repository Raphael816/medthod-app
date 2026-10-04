import { supabase } from '../lib/supabase'

/** 自分に割り当てられ、公開済みの志望校対策演習セット一覧。 */
export async function listMyPracticeSets(studentId) {
  const { data, error } = await supabase
    .from('practice_set_assignments')
    .select('id, status, due_date, practice_sets(id, title, description, subject, difficulty, time_limit_minutes, target_university_id, is_published)')
    .eq('student_id', studentId)
  if (error) throw error
  return (data ?? []).filter((a) => a.practice_sets)
}

/** 自分の答案提出のうち、講師が公開した添削結果。新しい順。 */
export async function listMyPublishedFeedback(studentId, limit = 5) {
  const { data, error } = await supabase
    .from('answer_feedback')
    .select(`
      id, score, feedback, deduction_reasons, improved_answer, created_at,
      answer_submissions!inner(
        id, question_id, answer_text,
        practice_set_attempts!inner(id, student_id, practice_set_id, practice_sets(title))
      )
    `)
    .eq('is_published', true)
    .eq('answer_submissions.practice_set_attempts.student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

/** 割当1件分の、演習セット・問題一覧・自分の割当状態をまとめて取得する。 */
export async function getAssignmentForTaking(assignmentId, studentId) {
  const { data, error } = await supabase
    .from('practice_set_assignments')
    .select(`
      id, status, due_date, student_id,
      practice_sets(
        id, title, description, subject, time_limit_minutes, strategy_notes, is_published,
        practice_set_questions(question_id, sort_order, points, questions(id, type, prompt, choices, unit_id))
      )
    `)
    .eq('id', assignmentId)
    .eq('student_id', studentId)
    .single()
  if (error) throw error
  const questions = [...(data.practice_sets?.practice_set_questions ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  return { ...data, questions }
}

/** 自分の直近の挑戦(in_progress優先、なければ最新)を取得する。 */
export async function getMyLatestAttempt(practiceSetId, studentId) {
  const { data, error } = await supabase
    .from('practice_set_attempts')
    .select('*')
    .eq('practice_set_id', practiceSetId)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  if (error) throw error
  const rows = data ?? []
  return rows.find((a) => a.status === 'in_progress') ?? rows[0] ?? null
}

/** 新しい挑戦を開始する(未着手または前回提出済みからの再演習)。割当も in_progress にする。 */
export async function startAttempt(practiceSetId, studentId, assignmentId) {
  const { data: attempt, error } = await supabase
    .from('practice_set_attempts')
    .insert({ practice_set_id: practiceSetId, student_id: studentId, status: 'in_progress' })
    .select()
    .single()
  if (error) throw error
  const { error: assignErr } = await supabase
    .from('practice_set_assignments')
    .update({ status: 'in_progress' })
    .eq('id', assignmentId)
    .eq('status', 'assigned')
  if (assignErr) throw assignErr
  return attempt
}

/** 指定した挑戦の、自分の解答下書きを取得する(question_id -> submission)。 */
export async function listSubmissionsForAttempt(attemptId) {
  const { data, error } = await supabase.from('answer_submissions').select('*').eq('attempt_id', attemptId)
  if (error) throw error
  return Object.fromEntries((data ?? []).map((s) => [s.question_id, s]))
}

/** 解答を保存する(未保存なら新規作成、保存済みなら更新)。 */
export async function saveAnswer(attemptId, questionId, answerText) {
  const { data: existing, error: findErr } = await supabase
    .from('answer_submissions').select('id').eq('attempt_id', attemptId).eq('question_id', questionId).maybeSingle()
  if (findErr) throw findErr
  if (existing) {
    const { error } = await supabase.from('answer_submissions').update({ answer_text: answerText, submitted_at: new Date().toISOString() }).eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('answer_submissions').insert({ attempt_id: attemptId, question_id: questionId, answer_text: answerText })
    if (error) throw error
  }
}

/** 挑戦を提出として確定する(以後、解答の変更は想定しない)。 */
export async function submitAttempt(attemptId, assignmentId, timeSpentSeconds) {
  const { error } = await supabase
    .from('practice_set_attempts')
    .update({ status: 'submitted', submitted_at: new Date().toISOString(), time_spent_seconds: timeSpentSeconds })
    .eq('id', attemptId)
  if (error) throw error
  const { error: assignErr } = await supabase
    .from('practice_set_assignments').update({ status: 'submitted' }).eq('id', assignmentId)
  if (assignErr) throw assignErr
}
