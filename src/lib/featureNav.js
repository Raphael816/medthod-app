// ナビゲーション・Route Guardの両方から参照する、ルート→機能コードの対応表。
// Phase 2以降で新しいルートを追加する際は、ここへ追記するだけでナビ表示と
// アクセス制御の両方に反映される(実際のデータアクセス可否は常にRLS/has_featureが
// 最終判定するため、この対応表はUI表示のためのショートカットに過ぎない)。
export const ROUTE_FEATURE_CODES = {
  '/study/units': 'unit_analysis',
  '/study/units/add': 'unit_analysis',
  '/study/materials': 'materials_view',
  '/study/videos': 'videos_view',
  '/study/review': 'basic_practice',
  '/practice': 'basic_practice',
  '/grades': 'grades_view',
  '/universities': 'target_university_analysis',
}

// 未購入機能をナビゲーションから完全に隠す('hide')か、ロック表示のまま残す('lock')かを
// 一箇所で切り替えられるようにする。
export const NAV_LOCK_MODE = 'lock'
