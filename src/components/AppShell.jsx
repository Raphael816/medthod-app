import { Icon3D } from './Icon3D'

const NAV = [
  { key: 'plan', label: '学習プラン', shape: 'icosahedron' },
  { key: 'grades', label: '成績管理', shape: 'octahedron' },
  { key: 'units', label: '単元登録', shape: 'dodecahedron' },
  { key: 'materials', label: '教材', shape: 'tetrahedron' },
  { key: 'videos', label: '動画視聴', shape: 'torus' },
]

export function AppShell({ studentName, current, onNavigate, onLogout, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo">
          MEDTHOD <span>SCHOOL</span>
        </div>
        <div className="sidebar-user">{studentName} さん</div>
        <nav className="sidebar-nav">
          {NAV.map((item) => (
            <button
              key={item.key}
              className={current === item.key ? 'active' : ''}
              onClick={() => onNavigate(item.key)}
            >
              <Icon3D shape={item.shape} size={22} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-outline btn-sm" onClick={onLogout}>
            ログアウト
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
