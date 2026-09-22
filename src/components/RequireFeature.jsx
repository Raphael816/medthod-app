import { LINE_URL } from '../lib/constants'
import { useEntitlements } from '../context/EntitlementsContext'
import { Loading, ErrorState } from './StateViews'

// 鍵アイコン(絵文字ではなく構造的なSVG)。
function LockIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="15.5" r="1.4" fill="currentColor" />
    </svg>
  )
}

const STATUS_MESSAGE = {
  paused: '現在、受講プログラムが休会中のため、この機能は利用できません。',
  expired: '受講プログラムの受講期間が終了しているため、この機能は利用できません。',
  cancelled: '受講プログラムが解約済みのため、この機能は利用できません。',
  pending: '受講プログラムがまだ開始されていないため、この機能は利用できません。',
  none: 'この機能は現在のプランに含まれていません。',
}

// 未購入機能のロック表示。鍵アイコンだけに頼らず、テキストで理由と次の行動を明示する。
// enrollmentStatusに応じて(休会中/期限切れ/解約済み/受講なし)文言を変える。
export function LockedFeature({ programHint, enrollmentStatus }) {
  const title = STATUS_MESSAGE[enrollmentStatus] ?? STATUS_MESSAGE.none
  return (
    <div className="card locked-feature" role="status">
      <div className="locked-feature-icon">
        <LockIcon />
      </div>
      <h2>{title}</h2>
      {programHint && <p>{programHint}</p>}
      <a className="btn btn-primary btn-sm" href={LINE_URL} target="_blank" rel="noreferrer">
        LINEでプランを相談する
      </a>
    </div>
  )
}

// featureCodeを持たない場合はLockedFeatureを表示し、対象のAPI呼び出し自体を行わない
// (children は hasFeature===true が確定するまでマウントされないため、未購入機能の
// データを先に取得してから隠す、という実装にはならない)。
// 権限判定はクライアント側の表示制御に過ぎず、実データの可否は必ずRLS/has_featureが
// サーバー側で再判定する(このガードを迂回してURLを直接叩いても取得できるデータは無い)。
export function RequireFeature({ code, programHint, children }) {
  const { loading, error, enrollmentStatus, hasFeature } = useEntitlements()
  if (loading) return <Loading />
  if (error) return <ErrorState message="受講プログラムの確認に失敗しました。時間をおいて再度お試しください。" />
  if (!hasFeature(code)) return <LockedFeature programHint={programHint} enrollmentStatus={enrollmentStatus} />
  return children
}
