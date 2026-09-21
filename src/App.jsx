import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Login } from './pages/Login'
import { HomePage } from './pages/HomePage'
import { GradesPage } from './pages/GradesPage'
import { UniversitiesPage } from './pages/UniversitiesPage'
import { ProfilePage } from './pages/ProfilePage'
import { PracticePage } from './pages/PracticePage'
import { UnitsRegisteredPage } from './pages/study/UnitsRegisteredPage'
import { UnitsAddPage } from './pages/study/UnitsAddPage'
import { UnitDetailPage } from './pages/study/UnitDetailPage'
import { MaterialsListPage } from './pages/study/MaterialsListPage'
import { MaterialDetailPage } from './pages/study/MaterialDetailPage'
import { VideosListPage } from './pages/study/VideosListPage'
import { VideoDetailPage } from './pages/study/VideoDetailPage'
import { ReviewPage } from './pages/study/ReviewPage'
import { supabase } from './lib/supabase'
import { EntitlementsProvider } from './context/EntitlementsContext'
import { RequireFeature } from './components/RequireFeature'

function App() {
  const [session, setSession] = useState(undefined)
  const [student, setStudent] = useState(null)

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

  return (
    <EntitlementsProvider studentId={student.id}>
      <AppShell studentName={student.name} onLogout={() => supabase.auth.signOut()}>
        <Routes>
          <Route path="/" element={<HomePage student={student} />} />
          <Route path="/study" element={<Navigate to="/study/units" replace />} />
          <Route path="/study/units" element={<UnitsRegisteredPage student={student} />} />
          <Route path="/study/units/add" element={<UnitsAddPage student={student} />} />
          <Route path="/study/units/:unitId" element={<UnitDetailPage student={student} />} />
          <Route path="/study/materials" element={<MaterialsListPage student={student} />} />
          <Route path="/study/materials/:materialId" element={<MaterialDetailPage student={student} />} />
          <Route path="/study/videos" element={<VideosListPage student={student} />} />
          <Route path="/study/videos/:videoId" element={<VideoDetailPage student={student} />} />
          <Route path="/study/review" element={<ReviewPage student={student} />} />
          <Route path="/practice" element={<PracticePage student={student} />} />
          <Route path="/practice/:unitId" element={<PracticePage student={student} />} />
          <Route path="/grades" element={<GradesPage student={student} />} />
          <Route
            path="/universities"
            element={
              <RequireFeature
                code="target_university_analysis"
                programHint="志望校の登録・大学別対策情報の閲覧は、プレミアムプラン・完全伴走プランに含まれます。"
              >
                <UniversitiesPage student={student} />
              </RequireFeature>
            }
          />
          <Route path="/profile" element={<ProfilePage student={student} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </EntitlementsProvider>
  )
}

export default App
