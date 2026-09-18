import { useEffect, useState } from 'react'
import { Tilt } from '../components/Tilt'
import { supabase } from '../lib/supabase'

const BUCKET = 'materials'
const SIGNED_URL_EXPIRES_IN = 60 * 10

export function MaterialsPage() {
  const [materials, setMaterials] = useState(null)
  const [links, setLinks] = useState({})

  useEffect(() => {
    supabase
      .from('materials')
      .select('id, title, description, storage_path, file_name, created_at')
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        setMaterials(data ?? [])
        const entries = await Promise.all(
          (data ?? []).map(async (m) => {
            const { data: signed } = await supabase.storage
              .from(BUCKET)
              .createSignedUrl(m.storage_path, SIGNED_URL_EXPIRES_IN)
            return [m.id, signed?.signedUrl]
          }),
        )
        setLinks(Object.fromEntries(entries))
      })
  }, [])

  if (materials === null) return <p className="empty-state">読み込み中...</p>

  return (
    <>
      <div className="page-header">
        <h1>教材</h1>
      </div>
      {materials.length === 0 ? (
        <div className="card empty-state">公開されている教材はまだありません。</div>
      ) : (
        materials.map((m) => (
          <Tilt className="card" key={m.id}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 8 }}>{m.title}</h2>
            {m.description && <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>{m.description}</p>}
            <a className="btn btn-outline btn-sm" href={links[m.id]} target="_blank" rel="noreferrer">
              ダウンロード({m.file_name})
            </a>
          </Tilt>
        ))
      )}
    </>
  )
}
