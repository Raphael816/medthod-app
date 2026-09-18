import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function ProfilePage({ student }) {
  const [examDate, setExamDate] = useState(student.exam_date ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    const { error } = await supabase.from('students').update({ exam_date: examDate || null }).eq('id', student.id)
    setSaving(false)
    setMessage(error ? '保存に失敗しました。' : '保存しました。')
  }

  return (
    <>
      <div className="page-header">
        <h1>マイページ</h1>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>基本情報</h2>
        <div className="unit-meta-row">
          <span>氏名: {student.name}</span>
          {student.target_university && <span>登録済みの志望校メモ: {student.target_university}</span>}
          <span>学習開始日: {student.start_date}</span>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>試験予定日</h2>
        <form onSubmit={handleSave} className="form-group" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </button>
        </form>
        {message && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 8 }}>{message}</p>}
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
          試験予定日は、ホーム画面の残り日数表示とAIのプラン生成で使われます。
        </p>
      </div>
    </>
  )
}
