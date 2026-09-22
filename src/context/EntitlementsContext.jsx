import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const EntitlementsContext = createContext(null)

// 「権限あり/なし」だけでなく、休会・期限切れ・受講履歴なしを区別できるようにする。
const NO_ENROLLMENT = 'none'

// 生徒の現在プログラム・状態・利用可能機能を、サーバー側のDB関数(get_my_entitlements)
// から1回だけ取得する。権限ロジックはすべてサーバー(has_feature)が正であり、
// ここでは結果をUI表示用にキャッシュしているだけ(このContextを信用してデータ取得の
// 可否を決めることはない。実際のアクセス可否は常にRLSが最終判定する)。
export function EntitlementsProvider({ studentId, children }) {
  const [state, setState] = useState(null) // undefined-like: null = loading

  useEffect(() => {
    if (!studentId) return
    let cancelled = false

    async function load() {
      const { data, error } = await supabase.rpc('get_my_entitlements')
      if (cancelled) return
      if (error) {
        setState({ error: true })
        return
      }
      const row = data?.[0] ?? null
      setState({
        error: false,
        enrollmentStatus: row ? row.enrollment_status : NO_ENROLLMENT,
        isCurrentlyActive: row ? row.is_currently_active : false,
        programCode: row?.program_code ?? null,
        programName: row?.program_name ?? null,
        startsAt: row?.starts_at ?? null,
        endsAt: row?.ends_at ?? null,
        featureCodes: new Set(row?.feature_codes ?? []),
      })
    }

    load()
    return () => {
      cancelled = true
    }
  }, [studentId])

  const value = useMemo(() => {
    if (state === null) {
      return { loading: true, error: false, enrollmentStatus: null, hasFeature: () => false }
    }
    return {
      loading: false,
      error: state.error,
      enrollmentStatus: state.error ? null : state.enrollmentStatus,
      isCurrentlyActive: state.isCurrentlyActive ?? false,
      activeProgram: state.isCurrentlyActive ? { code: state.programCode, name: state.programName } : null,
      // 休会中・期限切れ中でも「直近どのプログラムだったか」は表示できるようにしておく。
      lastProgram: state.programName ? { code: state.programCode, name: state.programName } : null,
      startsAt: state.startsAt ?? null,
      endsAt: state.endsAt ?? null,
      hasFeature: (code) => (state.error ? false : (state.featureCodes?.has(code) ?? false)),
    }
  }, [state])

  return <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>
}

export function useEntitlements() {
  const ctx = useContext(EntitlementsContext)
  if (!ctx) throw new Error('useEntitlements must be used within EntitlementsProvider')
  return ctx
}
