// 3段階プログラムの表示用メタデータ。価格は持たない(admin-webのservice_programsと同じ方針)。
// program_codeごとの「次の段階」「その段階だけが持つ機能(ページの権限ゲートに使う)」を1箇所にまとめる。
export const PROGRAM_STAGES = [
  {
    code: 'basic',
    order: 1,
    shortName: '基本プログラム',
    routePath: '/program/basic',
    gateFeature: 'materials_view',
    description: '教材・動画・基礎確認問題を中心に、志望校対策の前提となる基礎力を形成する段階です。',
  },
  {
    code: 'subject_personal',
    order: 2,
    shortName: '志望校別教科別個人プログラム',
    routePath: '/program/subject-personal',
    gateFeature: 'target_university_analysis',
    description: '志望大学の必要科目・出題傾向と現在の学力を比較し、科目別の得点力を伸ばす段階です。',
  },
  {
    code: 'university_intensive',
    order: 3,
    shortName: '完全個別プログラム 志望校対策講座',
    routePath: '/program/university-intensive',
    gateFeature: 'university_practice',
    description: '志望校形式の演習・答案添削・再演習によって、本番で必要な解答力を仕上げる段階です。',
  },
]

export function stageByCode(code) {
  return PROGRAM_STAGES.find((s) => s.code === code) ?? null
}

export function nextStage(code) {
  const current = stageByCode(code)
  if (!current) return PROGRAM_STAGES[0]
  return PROGRAM_STAGES.find((s) => s.order === current.order + 1) ?? null
}
