"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { useCommon } from "@/i18n/common"

export function LoadingState({ rows = 3 }: { rows?: number }) {
  const c = useCommon()
  return (
    <div role="status" aria-label={c.loading} className="grid gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}
