import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const EntitlementsContext = createContext(null)

// 生徒の有効な受講プログラムと、含まれる機能コードをまとめて1回だけ取得する。
// ここでの判定はUI表示(ロック画面の出し分け)専用。実際のデータ取得・更新の可否は
// 常にサーバー側のRLS/has_feature関数が最終判断する(このContextはそれを信用しない設計)。
export function EntitlementsProvider({ studentId, children }) {
  const [state, setState] = useState(null)

  useEffect(() => {
    if (!studentId) return
    let cancelled = false

    async function load() {
      const [{ data: enrollments, error: enrollError }, { data: overrides, error: overrideError }] = await Promise.all([
        supabase
          .from('student_program_enrollments')
          .select('*, service_programs(id, code, name, description, program_features(feature_id, features(code)))')
          .eq('status', 'active'),
        supabase.from('student_feature_overrides').select('*, features(code)'),
      ])
      if (cancelled) return
      if (enrollError || overrideError) {
        setState({ activeEnrollment: null, featureCodes: new Set(), error: true })
        return
      }

      const today = new Date().toISOString().slice(0, 10)
      const active = (enrollments ?? []).find((e) => {
        if (e.starts_at && e.starts_at > today) return false
        if (e.ends_at && e.ends_at < today) return false
        return true
      })

      const featureCodes = new Set(
        (active?.service_programs?.program_features ?? [])
          .map((pf) => pf.features?.code)
          .filter(Boolean),
      )
      const now = new Date()
      for (const o of overrides ?? []) {
        if (o.expires_at && new Date(o.expires_at) <= now) continue
        const code = o.features?.code
        if (!code) continue
        if (o.is_enabled) featureCodes.add(code)
        else featureCodes.delete(code)
      }

      setState({ activeEnrollment: active ?? null, featureCodes, error: false })
    }

    load()
    return () => {
      cancelled = true
    }
  }, [studentId])

  const value = useMemo(
    () => ({
      loading: state === null,
      error: state?.error ?? false,
      activeProgram: state?.activeEnrollment?.service_programs ?? null,
      activeEnrollment: state?.activeEnrollment ?? null,
      hasFeature: (code) => state?.featureCodes?.has(code) ?? false,
    }),
    [state],
  )

  return <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>
}

export function useEntitlements() {
  const ctx = useContext(EntitlementsContext)
  if (!ctx) throw new Error('useEntitlements must be used within EntitlementsProvider')
  return ctx
}
