import { supabase } from '../lib/supabase'

export async function listMemos(studentId, filter = {}) {
  let q = supabase.from('student_memos').select('*').eq('student_id', studentId).order('created_at', { ascending: false })
  if (filter.unitId) q = q.eq('unit_id', filter.unitId)
  if (filter.materialId) q = q.eq('material_id', filter.materialId)
  if (filter.videoId) q = q.eq('video_id', filter.videoId)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function addMemo(studentId, body, target = {}) {
  const { error } = await supabase.from('student_memos').insert({
    student_id: studentId,
    body,
    unit_id: target.unitId ?? null,
    material_id: target.materialId ?? null,
    video_id: target.videoId ?? null,
  })
  if (error) throw error
}

export async function addBookmark(studentId, { label, position }, target = {}) {
  const { error } = await supabase.from('bookmarks').insert({
    student_id: studentId,
    label,
    position: String(position),
    material_id: target.materialId ?? null,
    video_id: target.videoId ?? null,
  })
  if (error) throw error
}

export async function listBookmarks(studentId, target = {}) {
  let q = supabase.from('bookmarks').select('*').eq('student_id', studentId).order('created_at', { ascending: false })
  if (target.materialId) q = q.eq('material_id', target.materialId)
  if (target.videoId) q = q.eq('video_id', target.videoId)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}
