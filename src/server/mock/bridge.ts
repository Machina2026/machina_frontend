import type { Client, Me, Partner, User } from "@/lib/machina/types"

import { now } from "./dates"
import type { Store } from "./store"

// When the real Machina API handles accounts (MACHINA_API_URL), the mock still
// serves everything else. This maps the API's signed-in user onto the mock's
// records: the seeds share ids (u-c1, c1, p1, ...), and users or companies the
// mock hasn't seen (registered or invited through the API) are created here.

/** The mock user for the API's signed-in user, or null (signed out, or an admin). */
export function bridgeUser(store: Store, me: Me | null): User | null {
  if (!me?.org || me.user.role === "admin") return null
  const { user, org } = me
  const role = user.role as User["role"]

  if (role === "client" && !store.get<Client>("clients", org.id)) {
    store.put<Client>("clients", {
      id: org.id,
      name: org.name,
      vat: org.vat ?? "",
      address: org.address ?? "",
      city: org.city ?? "",
      province: org.province ?? "",
      email: org.email ?? user.email,
      pec: org.pec ?? "",
      sdi: org.sdi ?? "",
      phone: org.phone ?? "",
      demo: false,
      sites: [],
      createdAt: now(),
    })
  }
  if (role === "partner" && !store.get<Partner>("partners", org.id)) {
    store.put<Partner>("partners", {
      id: org.id,
      name: org.name,
      vat: org.vat ?? "",
      address: org.address ?? "",
      city: org.city ?? "",
      province: org.province ?? "",
      zones: org.zones ?? [],
      email: org.email ?? user.email,
      pec: org.pec ?? "",
      phone: org.phone ?? "",
      planId: org.planId ?? "base",
      // The API only lets approved partners sign in.
      verified: true,
      demo: false,
      conditions: "",
      attachments: [],
      createdAt: now(),
    })
  }

  return (
    store.get<User>("users", user.id) ??
    store.put<User>("users", {
      id: user.id,
      email: user.email,
      name: user.name,
      role,
      clientId: role === "client" ? org.id : null,
      partnerId: role === "partner" ? org.id : null,
      password: "", // passwords live in the API
      demo: user.demo,
    })
  )
}
