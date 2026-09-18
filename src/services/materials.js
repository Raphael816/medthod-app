import { supabase } from '../lib/supabase'

const SIGNED_URL_EXPIRES_IN = 60 * 30

/** @returns {Promise<object[]>} 公開済み教材(単元情報付き) */
export async function listMaterials() {
  const { data, error } = await supabase
    .from('materials')
    .select('*, units(id, subject, name)')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getMaterial(id) {
  const { data, error } = await supabase
    .from('materials')
    .select('*, units(id, subject, name)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getSignedMaterialUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from('materials')
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRES_IN)
  if (error) throw error
  return data.signedUrl
}

/** @returns {Promise<Record<string, object>>} material_id -> progress */
export async function listMaterialProgress(studentId) {
  const { data, error } = await supabase.from('material_progress').select('*').eq('student_id', studentId)
  if (error) throw error
  return Object.fromEntries((data ?? []).map((p) => [p.material_id, p]))
}

export async function saveMaterialProgress(studentId, materialId, { lastPage, isCompleted }) {
  const { error } = await supabase.from('material_progress').upsert(
    {
      student_id: studentId,
      material_id: materialId,
      last_page: lastPage,
      is_completed: isCompleted,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'student_id,material_id' },
  )
  if (error) throw error
}
