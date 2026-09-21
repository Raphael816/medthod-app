import { supabase } from '../lib/supabase'

// 生徒本人の有効な受講プログラムと、そこに含まれる機能コードの一覧を取得する。
// RLS(student_program_enrollments_select_own)により、自分の行しか返らない。
export async function listMyEnrollments() {
  const { data, error } = await supabase
    .from('student_program_enrollments')
    .select('*, service_programs(id, code, name, description)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// 表示に使える機能一覧(コード→名称)。features自体はログインしていれば閲覧可。
export async function listFeatures() {
  const { data, error } = await supabase.from('features').select('id, code, name, description')
  if (error) throw error
  return data ?? []
}

// 個別の機能コードを持っているかどうかを、DB関数 has_feature 経由で確認する。
// フロントの表示制御用であり、最終的な権限判定は必ずRLS/has_featureそのもの(サーバー側)が行う。
export async function checkFeature(featureCode) {
  const { data, error } = await supabase.rpc('has_feature', { p_feature_code: featureCode })
  if (error) throw error
  return data === true
}

// 複数の機能コードをまとめて確認し、{code: boolean} を返す。
export async function checkFeatures(featureCodes) {
  const entries = await Promise.all(
    featureCodes.map(async (code) => [code, await checkFeature(code)]),
  )
  return Object.fromEntries(entries)
}
