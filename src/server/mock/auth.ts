import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto"

import type { PublicUser, User } from "@/lib/machina/types"

import { addDays, now } from "./dates"
import type { Store } from "./store"

// Passwords and sessions. Sessions are opaque tokens kept in the store.

const SESSION_DAYS = 7
// Lower than a production setting on purpose: the mock hashes on every reset.
const ITERATIONS = 20_000

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const digest = pbkdf2Sync(password, salt, ITERATIONS, 32, "sha256").toString("hex")
  return `pbkdf2$${salt}$${digest}`
}

export function checkPassword(password: string, stored: string) {
  const [, salt, digest] = stored.split("$")
  if (!salt || !digest) return false
  const actual = Buffer.from(hashPassword(password, salt).split("$")[2], "hex")
  const expected = Buffer.from(digest, "hex")
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

type Session = { id: string; userId: string; expiresAt: string }

export function createSession(store: Store, userId: string): string {
  const token = randomBytes(32).toString("base64url")
  const expires = `${addDays(now().slice(0, 10), SESSION_DAYS)}${now().slice(10)}`
  store.put<Session>("sessions", { id: token, userId, expiresAt: expires })
  return token
}

export function deleteSession(store: Store, token: string | null) {
  if (token) store.delete("sessions", token)
}

export function userForToken(store: Store, token: string | null | undefined): User | null {
  if (!token) return null
  const s = store.get<Session>("sessions", token)
  if (!s || s.expiresAt < now()) return null
  return store.get<User>("users", s.userId)
}

export function publicUser(u: User): PublicUser {
  const { id, email, name, role, partnerId, clientId, demo } = u
  return { id, email, name, role, partnerId, clientId, demo }
}
