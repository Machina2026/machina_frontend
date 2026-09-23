"use client"

import { useEffect } from "react"

import { ErrorState } from "@/components/states/error-state"

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    // TODO: report to Sentry once it is configured.
    console.error(error)
  }, [error])

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 items-center py-8">
      <div className="w-full">
        <ErrorState onRetry={retry} />
      </div>
    </div>
  )
}
