import "server-only"

import type { Accessory, Model, Offer, Partner, PartnerPublic } from "@/lib/machina/types"

import { now } from "./dates"
import type { Store } from "./store"

// With MACHINA_API_URL set, the catalogue (models, offers, accessories) lives
// in the API. The mock still serves requests, quotes, orders, compare and the
// assistant, which price from the catalogue, so it copies the API's public
// catalogue into its store before handling a request.

type Snapshot = {
  models: Model[]
  offers: Offer[]
  accessories: Accessory[]
  partners: PartnerPublic[]
}

/** How long a copy is reused. Partners' edits reach quotes after at most this long. */
const TTL_MS = 5_000

let cached: { at: number; data: Promise<Snapshot> } | null = null

function fetchSnapshot(base: string): Promise<Snapshot> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.data
  const data = fetch(`${base}/api/catalog/snapshot`, { cache: "no-store" }).then(async (res) => {
    if (!res.ok) throw new Error(`Machina API GET /api/catalog/snapshot failed: ${res.status}`)
    return (await res.json()) as Snapshot
  })
  cached = { at: Date.now(), data }
  // Don't keep a failure around: the next request tries again.
  data.catch(() => {
    if (cached?.data === data) cached = null
  })
  return data
}

/** Replaces a collection's documents with `docs`. */
function replaceAll<T extends { id: string }>(store: Store, coll: string, docs: T[]) {
  const keep = new Set(docs.map((d) => d.id))
  for (const old of store.all<{ id: string }>(coll))
    if (!keep.has(old.id)) store.delete(coll, old.id)
  for (const d of docs) store.put(coll, d)
}

/** Copies the API's catalogue into the mock store. On failure, the store keeps its last copy. */
export async function syncCatalog(store: Store, base: string) {
  let snap: Snapshot
  try {
    snap = await fetchSnapshot(base)
  } catch (err) {
    console.error(err)
    return
  }
  replaceAll(store, "models", snap.models)
  replaceAll(store, "offers", snap.offers)
  replaceAll(store, "accessories", snap.accessories)
  // Partners the mock hasn't seen get a record from their public details.
  for (const p of snap.partners) {
    const existing = store.get<Partner>("partners", p.id)
    store.put<Partner>("partners", {
      ...(existing ?? {
        vat: "",
        address: "",
        email: "",
        pec: "",
        phone: "",
        planId: "base",
        conditions: "",
        attachments: [],
        createdAt: now(),
      }),
      id: p.id,
      name: p.name,
      city: p.city,
      province: p.province,
      zones: p.zones,
      verified: p.verified,
      demo: p.demo,
    })
  }
}
