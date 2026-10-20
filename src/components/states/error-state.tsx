"use client"

import { TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useCommon } from "@/i18n/common"

type ErrorStateProps = {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({ title, description, onRetry }: ErrorStateProps) {
  const c = useCommon()
  return (
    <div
      role="alert"
      className="border-destructive/30 flex flex-col items-center gap-3 rounded-xl border px-6 py-12 text-center"
    >
      <TriangleAlert aria-hidden className="text-destructive size-8" />
      <div className="grid gap-1">
        <p className="font-medium">{title ?? c.errorTitle}</p>
        <p className="text-muted-foreground max-w-md text-sm">{description ?? c.errorBody}</p>
      </div>
      {onRetry && <Button onClick={onRetry}>{c.tryAgain}</Button>}
    </div>
  )
}
