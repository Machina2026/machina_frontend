import "server-only"

import { seed } from "./seed"
import { Store } from "./store"

// One store per server process. Kept on globalThis so dev hot reloads
// don't wipe the data; restarting the server re-seeds it.
const g = globalThis as typeof globalThis & { __machinaStore?: Store }

export function getStore(): Store {
  if (!g.__machinaStore) {
    const store = new Store()
    seed(store)
    g.__machinaStore = store
  }
  return g.__machinaStore
}
