import { supabase } from '../lib/supabase'

/** 週次演習(単元別の正答/誤答)を全期間分取得する。 */
export async function listWeeklyUnitResults(studentId) {
  const { data, error } = await supabase
    .from('weekly_records')
    .select('id, week_number, weekly_record_units(correct_count, incorrect_count, unit_id, units(id, subject, name))')
    .eq('student_id', studentId)
    .order('week_number')
  if (error) throw error
  return data ?? []
}

/**
 * 単元ごとの正答率を、週次演習(weekly_record_units)と確認問題(question_attempts)の
 * 両方から集計する。到達度は「動画視聴率」では上げず、この正誤データを中心に計算する。
 */
export function aggregateUnitMastery(weeklyRecords, questionAttempts, units) {
  const totals = new Map() // unit_id -> {correct, incorrect}
  for (const r of weeklyRecords) {
    for (const ru of r.weekly_record_units ?? []) {
      const t = totals.get(ru.unit_id) ?? { correct: 0, incorrect: 0 }
      t.correct += ru.correct_count
      t.incorrect += ru.incorrect_count
      totals.set(ru.unit_id, t)
    }
  }
  for (const a of questionAttempts) {
    const unitId = a.questions?.unit_id
    if (!unitId || a.is_correct === null || a.is_correct === undefined) continue
    const t = totals.get(unitId) ?? { correct: 0, incorrect: 0 }
    if (a.is_correct) t.correct += 1
    else t.incorrect += 1
    totals.set(unitId, t)
  }

  return units.map((u) => {
    const t = totals.get(u.id) ?? { correct: 0, incorrect: 0 }
    const total = t.correct + t.incorrect
    const accuracy = total > 0 ? Math.round((t.correct / total) * 100) : null
    return { unit: u, correct: t.correct, incorrect: t.incorrect, total, accuracy }
  })
}

/** 科目(subject)ごとに正答率を集計する。 */
export function aggregateSubjectMastery(unitMastery) {
  const bySubject = new Map()
  for (const m of unitMastery) {
    const s = bySubject.get(m.unit.subject) ?? { correct: 0, incorrect: 0 }
    s.correct += m.correct
    s.incorrect += m.incorrect
    bySubject.set(m.unit.subject, s)
  }
  return [...bySubject.entries()].map(([subject, t]) => {
    const total = t.correct + t.incorrect
    return { subject, correct: t.correct, incorrect: t.incorrect, total, accuracy: total > 0 ? Math.round((t.correct / total) * 100) : null }
  })
}

/** 問題形式(type)別の正答率。 */
export function aggregateByQuestionType(questionAttempts) {
  const byType = new Map()
  for (const a of questionAttempts) {
    if (a.is_correct === null || a.is_correct === undefined) continue
    const type = a.questions?.type ?? '不明'
    const t = byType.get(type) ?? { correct: 0, incorrect: 0 }
    if (a.is_correct) t.correct += 1
    else t.incorrect += 1
    byType.set(type, t)
  }
  return [...byType.entries()].map(([type, t]) => {
    const total = t.correct + t.incorrect
    return { type, correct: t.correct, incorrect: t.incorrect, total, accuracy: total > 0 ? Math.round((t.correct / total) * 100) : null }
  })
}
