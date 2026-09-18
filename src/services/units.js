// 生徒ページ全体で使うデータアクセス層。将来 Edge Function 等の実APIに差し替えやすいよう、
// UIコンポーネントは supabase クライアントを直接叩かず、必ずこの層の関数を呼ぶ。
//
// JSDocで最低限の型を明示する(このプロジェクトはTypeScriptを導入していないため)。

import { supabase } from '../lib/supabase'

/**
 * @typedef {Object} Unit
 * @property {string} id
 * @property {string} subject
 * @property {string} name
 * @property {string|null} description
 * @property {number|null} difficulty
 * @property {number|null} standard_hours
 * @property {string|null} parent_id
 */

/** @returns {Promise<Unit[]>} */
export async function listUnits() {
  const { data, error } = await supabase.from('units').select('*').order('sort_order')
  if (error) throw error
  return data ?? []
}

/**
 * @typedef {Object} StudentUnit
 * @property {string} id
 * @property {string} unit_id
 * @property {boolean} is_registered
 * @property {number} priority
 * @property {string} status
 * @property {boolean} is_instructor_assigned
 */

/** @returns {Promise<StudentUnit[]>} */
export async function listStudentUnits(studentId) {
  const { data, error } = await supabase
    .from('student_unit_priorities')
    .select('*')
    .eq('student_id', studentId)
  if (error) throw error
  return data ?? []
}

export async function registerUnit(studentId, unitId, { priority = 3, status = '未着手' } = {}) {
  const { error } = await supabase
    .from('student_unit_priorities')
    .upsert(
      { student_id: studentId, unit_id: unitId, is_registered: true, priority, status },
      { onConflict: 'student_id,unit_id' },
    )
  if (error) throw error
}

export async function unregisterUnit(studentId, unitId) {
  const { error } = await supabase
    .from('student_unit_priorities')
    .update({ is_registered: false })
    .eq('student_id', studentId)
    .eq('unit_id', unitId)
    .eq('is_instructor_assigned', false)
  if (error) throw error
}

export async function updateUnitStatus(studentId, unitId, status) {
  const { error } = await supabase
    .from('student_unit_priorities')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .eq('unit_id', unitId)
  if (error) throw error
}

export async function updateUnitPriority(studentId, unitId, priority) {
  const { error } = await supabase
    .from('student_unit_priorities')
    .upsert(
      { student_id: studentId, unit_id: unitId, priority, is_registered: priority > 0 },
      { onConflict: 'student_id,unit_id' },
    )
  if (error) throw error
}
