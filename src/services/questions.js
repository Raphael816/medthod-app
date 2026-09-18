import { supabase } from '../lib/supabase'

const QUESTION_TYPES = [
  '一問一答', '正誤問題', '多肢選択', '計算問題', '記述問題',
  'グラフ読解', '実験考察', '英文読解', '小論文',
]
export { QUESTION_TYPES }

export async function listQuestionsByUnit(unitId) {
  const { data, error } = await supabase.from('questions').select('*').eq('unit_id', unitId).order('sort_order')
  if (error) throw error
  return data ?? []
}

export async function listAllQuestions() {
  const { data, error } = await supabase
    .from('questions')
    .select('*, units(id, subject, name)')
    .order('sort_order')
  if (error) throw error
  return data ?? []
}

/** 採点: 選択式/一問一答は文字列一致、記述問題等はここでは「自己採点」を促す(is_correctはnull) */
function grade(question, answer) {
  if (['記述問題', '小論文', '英文読解', '実験考察', 'グラフ読解'].includes(question.type)) {
    return null // 自己採点(結果画面でボタンにより手動申告)
  }
  const normalize = (s) => (s ?? '').trim().toLowerCase()
  return normalize(answer) === normalize(question.correct_answer)
}

export async function submitAnswer(studentId, question, answer) {
  const isCorrect = grade(question, answer)
  const { data, error } = await supabase
    .from('question_attempts')
    .insert({ student_id: studentId, question_id: question.id, answer, is_correct: isCorrect })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function submitSelfAssessment(attemptId, isCorrect) {
  const { error } = await supabase.from('question_attempts').update({ is_correct: isCorrect }).eq('id', attemptId)
  if (error) throw error
}

export async function listAttempts(studentId) {
  const { data, error } = await supabase
    .from('question_attempts')
    .select('*, questions(id, unit_id, type, difficulty)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}
