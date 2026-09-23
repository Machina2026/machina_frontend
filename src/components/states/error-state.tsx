import { TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"

type ErrorStateProps = {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again. If the problem continues, contact support.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="border-destructive/30 flex flex-col items-center gap-3 rounded-xl border px-6 py-12 text-center"
    >
      <TriangleAlert aria-hidden className="text-destructive size-8" />
      <div className="grid gap-1">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground max-w-md text-sm">{description}</p>
      </div>
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </div>
  )
}
