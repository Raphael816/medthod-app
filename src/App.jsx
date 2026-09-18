import { useEffect, useState } from 'react'
import { AppShell } from './components/AppShell'
import { Login } from './pages/Login'
import { PlanPage } from './pages/PlanPage'
import { GradesPage } from './pages/GradesPage'
import { UnitsPage } from './pages/UnitsPage'
import { MaterialsPage } from './pages/MaterialsPage'
import { VideosPage } from './pages/VideosPage'
import { supabase } from './lib/supabase'

function App() {
  const [session, setSession] = useState(undefined)
  const [student, setStudent] = useState(null)
  const [page, setPage] = useState('plan')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setStudent(null)
      return
    }
    supabase
      .from('students')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setStudent(data))
  }, [session])

  if (session === undefined) return null
  if (!session) return <Login />
  if (!student) return <p className="empty-state">読み込み中...</p>

  const pages = {
    plan: <PlanPage student={student} />,
    grades: <GradesPage student={student} />,
    units: <UnitsPage student={student} />,
    materials: <MaterialsPage student={student} />,
    videos: <VideosPage />,
  }

  return (
    <AppShell
      studentName={student.name}
      current={page}
      onNavigate={setPage}
      onLogout={() => supabase.auth.signOut()}
    >
      {pages[page]}
    </AppShell>
  )
}

export default App
