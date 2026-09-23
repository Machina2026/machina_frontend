"use client"

import type { UseQueryResult } from "@tanstack/react-query"
import * as React from "react"

import { ErrorState } from "@/components/states/error-state"
import { LoadingState } from "@/components/states/loading-state"

/** Loading and error states for a query; renders children with the data once loaded. */
export function QueryView<T>({
  query,
  children,
  rows,
}: {
  query: UseQueryResult<T>
  children: (data: T) => React.ReactNode
  rows?: number
}) {
  if (query.isPending) return <LoadingState rows={rows} />
  if (query.isError) {
    return <ErrorState description={query.error.message} onRetry={() => query.refetch()} />
  }
  return <>{children(query.data)}</>
}
