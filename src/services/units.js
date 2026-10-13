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

// 単元の登録(is_registered)・必須指定(is_instructor_assigned)は講師(admin-web)のみが行う。
// 生徒は登録済み単元の学習ステータスだけ自分で更新できる(DB側のトリガーでも、生徒からの
// is_registered/is_instructor_assignedの変更は無効化される)。

export async function updateUnitStatus(studentId, unitId, status) {
  const { error } = await supabase
    .from('student_unit_priorities')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .eq('unit_id', unitId)
  if (error) throw error
}
