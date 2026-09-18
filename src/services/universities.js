import { supabase } from '../lib/supabase'

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

export async function addTargetUniversity(studentId, universityName, universityProfileId, rank) {
  const { error } = await supabase.from('student_target_universities').insert({
    student_id: studentId,
    university_name: universityName,
    university_profile_id: universityProfileId ?? null,
    rank,
  })
  if (error) throw error
}

export async function removeTargetUniversity(id) {
  const { error } = await supabase.from('student_target_universities').delete().eq('id', id)
  if (error) throw error
}
