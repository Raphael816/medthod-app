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
import { BasicProgramPage } from './pages/program/BasicProgramPage'
import { SubjectPersonalProgramPage } from './pages/program/SubjectPersonalProgramPage'
import { UniversityIntensiveProgramPage } from './pages/program/UniversityIntensiveProgramPage'
import { supabase } from './lib/supabase'
import { EntitlementsProvider, useEntitlements } from './context/EntitlementsContext'
import { RequireFeature } from './components/RequireFeature'
import { stageByCode } from './lib/programStages'

const HINT = {
  unit_analysis: '単元登録・単元別到達度の閲覧は、ベーシックプラン以上に含まれます。',
  materials_view: '教材の閲覧は、ベーシックプラン以上に含まれます。',
  videos_view: '動画の視聴は、ベーシックプラン以上に含まれます。',
  basic_practice: '確認問題演習・復習は、ベーシックプラン以上に含まれます。',
  grades_view: '成績の閲覧は、ベーシックプラン以上に含まれます。',
  target_university_analysis: '志望校の登録・大学別対策情報の閲覧は、志望校別教科別個人プログラム以上に含まれます。',
  university_practice: '志望校対策演習は、完全伴走プランに含まれます。',
}

function Guard({ code, children }) {
  return (
    <RequireFeature code={code} programHint={HINT[code]}>
      {children}
    </RequireFeature>
  )
}

// /program へ来た場合、今の受講プログラムに対応する段階ページへ案内する
// (現在のプログラムが分からない間はbasicへ、受講なしでもbasicへ飛ばしロック画面で案内する)。
function ProgramIndexRedirect() {
  const { loading, activeProgram } = useEntitlements()
  if (loading) return null
  const target = activeProgram ? stageByCode(activeProgram.code)?.routePath : null
  return <Navigate to={target ?? '/program/basic'} replace />
}

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
          <Route path="/program" element={<ProgramIndexRedirect />} />
          <Route path="/study" element={<Navigate to="/study/units" replace />} />
          <Route path="/study/units" element={<Guard code="unit_analysis"><UnitsRegisteredPage student={student} /></Guard>} />
          <Route path="/study/units/add" element={<Guard code="unit_analysis"><UnitsAddPage student={student} /></Guard>} />
          <Route path="/study/units/:unitId" element={<Guard code="unit_analysis"><UnitDetailPage student={student} /></Guard>} />
          <Route path="/study/materials" element={<Guard code="materials_view"><MaterialsListPage student={student} /></Guard>} />
          <Route path="/study/materials/:materialId" element={<Guard code="materials_view"><MaterialDetailPage student={student} /></Guard>} />
          <Route path="/study/videos" element={<Guard code="videos_view"><VideosListPage student={student} /></Guard>} />
          <Route path="/study/videos/:videoId" element={<Guard code="videos_view"><VideoDetailPage student={student} /></Guard>} />
          <Route path="/study/review" element={<Guard code="basic_practice"><ReviewPage student={student} /></Guard>} />
          <Route path="/practice" element={<Guard code="basic_practice"><PracticePage student={student} /></Guard>} />
          <Route path="/practice/:unitId" element={<Guard code="basic_practice"><PracticePage student={student} /></Guard>} />
          <Route path="/grades" element={<Guard code="grades_view"><GradesPage student={student} /></Guard>} />
          <Route path="/universities" element={<Guard code="target_university_analysis"><UniversitiesPage student={student} /></Guard>} />
          <Route path="/program/basic" element={<Guard code="materials_view"><BasicProgramPage student={student} /></Guard>} />
          <Route path="/program/subject-personal" element={<Guard code="target_university_analysis"><SubjectPersonalProgramPage student={student} /></Guard>} />
          <Route path="/program/university-intensive" element={<Guard code="university_practice"><UniversityIntensiveProgramPage student={student} /></Guard>} />
          <Route path="/profile" element={<ProfilePage student={student} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </EntitlementsProvider>
  )
}

export default App
