import { supabase } from './supabase'

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

export async function callStudentApi(action) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  const res = await fetch(`${FUNCTIONS_URL}/student-api`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'リクエストに失敗しました。')
  return json.data
}
