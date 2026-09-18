import { NavLink, useLocation } from 'react-router-dom'
import { Icon3D } from './Icon3D'

const STUDY_CHILDREN = [
  { to: '/study/units', label: '登録中の単元' },
  { to: '/study/units/add', label: '単元を追加' },
  { to: '/study/materials', label: '教材' },
  { to: '/study/videos', label: '動画' },
  { to: '/study/review', label: '復習' },
]

const NAV = [
  { to: '/', label: 'ホーム', shape: 'icosahedron', end: true },
  { to: '/study', label: '学習', shape: 'octahedron', children: STUDY_CHILDREN },
  { to: '/practice', label: '問題演習', shape: 'tetrahedron' },
  { to: '/grades', label: '成績', shape: 'dodecahedron' },
  { to: '/universities', label: '志望大学', shape: 'torus' },
  { to: '/profile', label: 'マイページ', shape: 'icosahedron' },
]

function NavButton({ item }) {
  const location = useLocation()
  const isStudySection = item.children && location.pathname.startsWith('/study')
  return (
    <div className={isStudySection ? 'nav-group open' : 'nav-group'}>
      <NavLink to={item.to} end={item.end} className={({ isActive }) => (isActive || isStudySection ? 'active' : '')}>
        <Icon3D shape={item.shape} size={22} />
        {item.label}
      </NavLink>
      {item.children && isStudySection && (
        <div className="nav-subgroup">
          {item.children.map((c) => (
            <NavLink key={c.to} to={c.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              {c.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export function AppShell({ studentName, onLogout, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo">
          MEDTHOD <span>SCHOOL</span>
        </div>
        <div className="sidebar-user">{studentName} さん</div>
        <nav className="sidebar-nav">
          {NAV.map((item) => (
            <NavButton key={item.to} item={item} />
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-outline btn-sm" onClick={onLogout}>
            ログアウト
          </button>
        </div>
      </aside>

      <main className="main">{children}</main>

      <nav className="bottom-nav" aria-label="メインナビゲーション">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon3D shape={item.shape} size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
