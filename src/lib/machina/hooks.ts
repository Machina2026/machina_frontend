"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"

import { api, ApiError } from "./api"
import type { Me, MetaResponse } from "./types"

export const metaKey = ["meta"] as const
export const meKey = ["me"] as const

/** Catalogue metadata (categories, spec sheets, provinces, accessories, plans). */
export function useMeta() {
  return useQuery({
    queryKey: metaKey,
    queryFn: () => api.get<MetaResponse>("/api/meta"),
    staleTime: 5 * 60_000,
  })
}

/** The signed-in user and organisation, or null when signed out. */
export function useMe() {
  return useQuery({
    queryKey: meKey,
    queryFn: async () => {
      try {
        return await api.get<Me>("/api/auth/me")
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null
        throw err
      }
    },
    staleTime: 60_000,
  })
}

/** Refresh everything after a sign-in, sign-out or demo reset. */
export function useResetSessionData() {
  const qc = useQueryClient()
  return () => qc.resetQueries()
}
