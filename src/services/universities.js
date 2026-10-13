import { supabase } from '../lib/supabase'
import { callStudentApi } from '../lib/studentApi'

export async function listUniversityProfiles() {
  const { data, error } = await supabase.from('university_profiles').select('id, name, aliases, summary, source_url')
  if (error) throw error
  return data ?? []
}

export async function listTargetUniversities(studentId) {
  const { data, error } = await supabase
    .from('student_target_universities')
    .select('*, university_profiles(id, name, summary, source_url)')
    .eq('student_id', studentId)
    .order('rank')
  if (error) throw error
  return data ?? []
}

// student-api経由にしているのは、第一志望(rank=1)が変わったときにAIのプラン下書きを
// 自動で再生成する副作用をサーバー側で行うため(RLS直書きではこの副作用が起きない)。
export async function addTargetUniversity(universityName, universityProfileId) {
  return callStudentApi('add_target_university', { universityName, universityProfileId: universityProfileId ?? null })
}

export async function removeTargetUniversity(id) {
  return callStudentApi('remove_target_university', { id })
}

export async function setPrimaryTargetUniversity(id) {
  return callStudentApi('set_primary_target_university', { id })
}
