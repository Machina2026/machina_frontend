"use client"

import { useEffect, useState, useSyncExternalStore } from "react"

const noop = () => () => {}

/** False during SSR and hydration, true afterwards (for browser-only state like localStorage). */
export function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false
  )
}

/** `value`, updated only after it stops changing for `ms`. */
export function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}
