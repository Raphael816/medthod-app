import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/study/units', label: '登録中の単元' },
  { to: '/study/units/add', label: '単元を追加' },
  { to: '/study/materials', label: '教材' },
  { to: '/study/videos', label: '動画' },
  { to: '/study/review', label: '復習' },
]

/** モバイルでのみ表示される、学習セクション内のタブ切り替え(デスクトップはサイドバーで代替)。 */
export function StudyTabs() {
  return (
    <nav className="study-tabs" aria-label="学習セクション内ナビゲーション">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? 'active' : '')}>
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
