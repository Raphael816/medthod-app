import { supabase } from '../lib/supabase'

export async function listVideos() {
  const { data, error } = await supabase
    .from('videos')
    .select('*, units(id, subject, name), video_chapters(id, title, start_seconds, sort_order)')
    .order('sort_order')
  if (error) throw error
  return (data ?? []).map((v) => ({
    ...v,
    video_chapters: [...(v.video_chapters ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  }))
}

export async function getVideo(id) {
  const { data, error } = await supabase
    .from('videos')
    .select('*, units(id, subject, name), video_chapters(id, title, start_seconds, sort_order)')
    .eq('id', id)
    .single()
  if (error) throw error
  return { ...data, video_chapters: [...(data.video_chapters ?? [])].sort((a, b) => a.sort_order - b.sort_order) }
}

export async function listVideoProgress(studentId) {
  const { data, error } = await supabase.from('video_progress').select('*').eq('student_id', studentId)
  if (error) throw error
  return Object.fromEntries((data ?? []).map((p) => [p.video_id, p]))
}

export async function saveVideoProgress(studentId, videoId, { positionSeconds, watchedRatio, isCompleted }) {
  const { error } = await supabase.from('video_progress').upsert(
    {
      student_id: studentId,
      video_id: videoId,
      position_seconds: Math.round(positionSeconds),
      watched_ratio: Math.min(100, Math.round(watchedRatio * 100) / 100),
      is_completed: isCompleted,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'student_id,video_id' },
  )
  if (error) throw error
}
