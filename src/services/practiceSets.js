import { supabase } from '../lib/supabase'

// practice_sets / answer_feedback はPhase 1でデータ基盤のみ追加済み(講師による
// 作成・割当・採点のUIはPhase 3で実装予定)。ここでは既存のテーブル・RLSに対して
// 素直にクエリするだけで、存在しないデータを作り出すことはしない。
// 現時点では該当データが無く空配列が返るのが正しい状態。

/** 自分に割り当てられ、公開済みの志望校対策演習セット一覧。 */
export async function listMyPracticeSets(studentId) {
  const { data, error } = await supabase
    .from('practice_set_assignments')
    .select('id, status, due_date, practice_sets(id, title, description, subject, difficulty, time_limit_minutes, target_university_id)')
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
