import type { FileMeta } from "@/lib/machina/types"

import { now } from "./dates"

type StoredFile = { meta: FileMeta; content: Buffer }

type Snapshot = {
  docs: Map<string, Map<string, unknown>>
  files: Map<string, StoredFile>
  counters: Map<string, number>
}

const clone = <T>(value: T): T => structuredClone(value)

/**
 * In-memory document store standing in for the demo's SQLite store.
 * Reads return copies, so a document only changes when it is put back.
 * Each API request runs inside `transaction`, which rolls back on error.
 */
export class Store {
  private docs = new Map<string, Map<string, unknown>>()
  private files = new Map<string, StoredFile>()
  private counters = new Map<string, number>()

  all<T>(coll: string): T[] {
    return [...(this.docs.get(coll)?.values() ?? [])].map((d) => clone(d as T))
  }

  find<T>(coll: string, pred: (doc: T) => boolean): T[] {
    return this.all<T>(coll).filter(pred)
  }

  get<T>(coll: string, id: string): T | null {
    const doc = this.docs.get(coll)?.get(id)
    return doc === undefined ? null : clone(doc as T)
  }

  put<T extends { id: string }>(coll: string, doc: T): T {
    let c = this.docs.get(coll)
    if (!c) this.docs.set(coll, (c = new Map()))
    c.set(doc.id, clone(doc))
    return doc
  }

  delete(coll: string, id: string) {
    this.docs.get(coll)?.delete(id)
  }

  counter(name: string): number {
    const value = (this.counters.get(name) ?? 0) + 1
    this.counters.set(name, value)
    return value
  }

  putFile(
    id: string,
    meta: Omit<FileMeta, "id" | "size" | "createdAt">,
    content: Buffer
  ): FileMeta {
    const full: FileMeta = { ...meta, id, size: content.length, createdAt: now() }
    this.files.set(id, { meta: full, content })
    return clone(full)
  }

  getFile(id: string): StoredFile | null {
    const f = this.files.get(id)
    return f ? { meta: clone(f.meta), content: f.content } : null
  }

  fileMeta(id: string): FileMeta | null {
    const f = this.files.get(id)
    return f ? clone(f.meta) : null
  }

  wipe() {
    this.docs.clear()
    this.files.clear()
    this.counters.clear()
  }

  /** Run `fn`; if it throws, restore the state from before the call. */
  transaction<T>(fn: () => T): T {
    const snapshot = this.snapshot()
    try {
      return fn()
    } catch (err) {
      this.restore(snapshot)
      throw err
    }
  }

  private snapshot(): Snapshot {
    return {
      docs: new Map([...this.docs].map(([k, v]) => [k, new Map(v)])),
      files: new Map(this.files),
      counters: new Map(this.counters),
    }
  }

  private restore(s: Snapshot) {
    this.docs = s.docs
    this.files = s.files
    this.counters = s.counters
  }
}
