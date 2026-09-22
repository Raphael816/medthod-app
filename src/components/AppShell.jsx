import { NavLink, useLocation } from 'react-router-dom'
import { Icon3D } from './Icon3D'
import { useEntitlements } from '../context/EntitlementsContext'
import { ROUTE_FEATURE_CODES, NAV_LOCK_MODE } from '../lib/featureNav'

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

// 絵文字ではなく構造的なSVG。ナビ上で「ロックされた項目」であることを色だけに頼らず示す。
function NavLockBadge() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" className="nav-lock-badge">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2.2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

function useLockedPaths() {
  const { loading, hasFeature } = useEntitlements()
  return (to) => {
    const code = ROUTE_FEATURE_CODES[to]
    if (!code) return false
    if (loading) return false
    return !hasFeature(code)
  }
}

function NavButton({ item, isLocked }) {
  const location = useLocation()
  const isStudySection = item.children && location.pathname.startsWith('/study')
  const locked = isLocked(item.to)
  if (locked && NAV_LOCK_MODE === 'hide' && !item.children) return null

  return (
    <div className={isStudySection ? 'nav-group open' : 'nav-group'}>
      <NavLink to={item.to} end={item.end} className={({ isActive }) => (isActive || isStudySection ? 'active' : '')}>
        <Icon3D shape={item.shape} size={22} />
        {item.label}
        {locked && !item.children && (
          <>
            <NavLockBadge />
            <span className="sr-only">(現在のプランには含まれていません)</span>
          </>
        )}
      </NavLink>
      {item.children && isStudySection && (
        <div className="nav-subgroup">
          {item.children.map((c) => {
            const childLocked = isLocked(c.to)
            if (childLocked && NAV_LOCK_MODE === 'hide') return null
            return (
              <NavLink key={c.to} to={c.to} className={({ isActive }) => (isActive ? 'active' : '')}>
                {c.label}
                {childLocked && (
                  <>
                    <NavLockBadge />
                    <span className="sr-only">(現在のプランには含まれていません)</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function AppShell({ studentName, onLogout, children }) {
  const isLocked = useLockedPaths()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo">
          MEDTHOD <span>SCHOOL</span>
        </div>
        <div className="sidebar-user">{studentName} さん</div>
        <nav className="sidebar-nav">
          {NAV.map((item) => (
            <NavButton key={item.to} item={item} isLocked={isLocked} />
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
        {NAV.map((item) => {
          const locked = isLocked(item.to)
          if (locked && NAV_LOCK_MODE === 'hide') return null
          return (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon3D shape={item.shape} size={20} />
              <span>
                {item.label}
                {locked && <NavLockBadge />}
              </span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
