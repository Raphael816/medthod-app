import { supabase } from '../lib/supabase'

export async function listReviewSchedules(studentId) {
  const { data, error } = await supabase
    .from('review_schedules')
    .select('*, units(id, subject, name)')
    .eq('student_id', studentId)
    .eq('is_done', false)
    .order('due_date')
  if (error) throw error
  return data ?? []
}

export async function scheduleReview(studentId, unitId, reason, daysFromNow = 2) {
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + daysFromNow)
  const { error } = await supabase.from('review_schedules').insert({
    student_id: studentId,
    unit_id: unitId,
    due_date: dueDate.toISOString().slice(0, 10),
    reason,
  })
  if (error) throw error
}

export async function markReviewDone(id) {
  const { error } = await supabase.from('review_schedules').update({ is_done: true }).eq('id', id)
  if (error) throw error
}
