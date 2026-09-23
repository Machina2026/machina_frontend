"use client"

import { useSyncExternalStore } from "react"

import type { Needs, RequestSource } from "./types"

// Request draft ("cart"): machines picked from the catalogue or the assistant,
// kept in this browser until the customer sends the request.

export type DraftItem = {
  id: string
  offerId: string
  modelId: string
  qty: number
  accessoryIds: string[]
  transport: boolean
  operator: boolean
}

export type Draft = {
  items: DraftItem[]
  from: string
  to: string
  siteId: string
  site: { name: string; address: string; city: string; province: string }
  needs: Needs
  jobDescription: string
  source: RequestSource
}

const KEY = "machina.draft"
const EVENT = "machina:draft"

export const emptyDraft = (): Draft => ({
  items: [],
  from: "",
  to: "",
  siteId: "",
  site: { name: "", address: "", city: "", province: "TO" },
  needs: { accessWidth: "", ground: "", schedule: "", notes: "" },
  jobDescription: "",
  source: "direct",
})

let cachedRaw: string | null = null
let cached: Draft = emptyDraft()

export function readDraft(): Draft {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    // Storage unavailable (private mode, blocked): behave as empty.
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw
    try {
      cached = raw ? { ...emptyDraft(), ...JSON.parse(raw) } : emptyDraft()
    } catch {
      cached = emptyDraft()
    }
  }
  return cached
}

export function saveDraft(d: Draft) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d))
  } catch {
    // Ignore: the draft simply won't persist.
  }
  window.dispatchEvent(new Event(EVENT))
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Ignore.
  }
  window.dispatchEvent(new Event(EVENT))
}

/** Add a machine; `extra` fills period or other draft fields when given. */
export function addToDraft(
  item: Omit<DraftItem, "id">,
  extra: Partial<Pick<Draft, "from" | "to">> = {}
) {
  const d = structuredClone(readDraft())
  d.items.push({ ...item, id: `it-${Math.random().toString(36).slice(2, 9)}` })
  if (extra.from) d.from = extra.from
  if (extra.to) d.to = extra.to
  saveDraft(d)
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => e.key === KEY && onChange()
  window.addEventListener(EVENT, onChange)
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener("storage", onStorage)
  }
}

const serverSnapshot = emptyDraft()

/** Current draft; updates across components and browser tabs. */
export function useDraft(): Draft {
  return useSyncExternalStore(subscribe, readDraft, () => serverSnapshot)
}
