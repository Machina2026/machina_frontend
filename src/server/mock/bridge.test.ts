import { beforeEach, describe, expect, it } from "vitest"

import type { Client, Me, Partner, User } from "@/lib/machina/types"

import { bridgeUser } from "./bridge"
import { dispatch } from "./routes"
import { seed } from "./seed"
import { Store } from "./store"

let store: Store
beforeEach(() => {
  store = new Store()
  seed(store)
})

const me = (over: Partial<Me["user"]>, org: Me["org"]): Me => ({
  user: {
    id: "u-new",
    email: "new@test.it",
    name: "New User",
    role: "client",
    clientId: null,
    partnerId: null,
    demo: false,
    ...over,
  },
  org,
})

describe("bridgeUser", () => {
  it("maps a seeded demo user by id", () => {
    const user = bridgeUser(store, me({ id: "u-c1" }, { id: "c1", name: "Edilizia Monviso" }))
    expect(user).toMatchObject({ id: "u-c1", clientId: "c1" })
  })

  it("creates the company and user the mock hasn't seen", () => {
    const user = bridgeUser(
      store,
      me(
        { id: "u-p9", role: "partner" },
        { id: "p9", name: "New Rent", vat: "IT12345678901", zones: ["TO", "CN"], province: "TO" }
      )
    )
    expect(user).toMatchObject({ id: "u-p9", role: "partner", partnerId: "p9", clientId: null })
    expect(store.get<Partner>("partners", "p9")).toMatchObject({
      name: "New Rent",
      vat: "IT12345678901",
      zones: ["TO", "CN"],
      verified: true,
    })
    // Second call reuses the records.
    bridgeUser(store, me({ id: "u-p9", role: "partner" }, { id: "p9", name: "Renamed" }))
    expect(store.get<Partner>("partners", "p9")!.name).toBe("New Rent")
  })

  it("adds a new team member to an existing company", () => {
    const user = bridgeUser(store, me({ id: "u-c1b" }, { id: "c1", name: "Edilizia Monviso" }))
    expect(user).toMatchObject({ id: "u-c1b", clientId: "c1" })
    expect(store.all<Client>("clients").filter((c) => c.id === "c1")).toHaveLength(1)
  })

  it("gives admins and signed-out visitors no mock user", () => {
    expect(bridgeUser(store, null)).toBeNull()
    expect(bridgeUser(store, me({ id: "u-admin", role: "admin" }, null))).toBeNull()
  })

  it("lets mock routes use the API's user", () => {
    const user = bridgeUser(store, me({ id: "u-c1" }, { id: "c1", name: "Edilizia Monviso" }))
    const company = dispatch(
      { store, token: null, body: {}, query: {}, user },
      "GET",
      "/api/client/company"
    ) as Client
    expect(company.id).toBe("c1")
    expect(() =>
      dispatch(
        { store, token: null, body: {}, query: {}, user: null },
        "GET",
        "/api/client/company"
      )
    ).toThrow("Please sign in")
    expect(store.get<User>("users", "u-c1")!.password).not.toBe("")
  })
})
