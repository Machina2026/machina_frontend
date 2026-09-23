import { beforeEach, describe, expect, it } from "vitest"

import type { Client, Order, Quote, User } from "@/lib/machina/types"

import { addDays, today } from "./dates"
import { dispatch, type SessionResult } from "./routes"
import { seed } from "./seed"
import * as S from "./services"
import { Store } from "./store"

let store: Store
const user = (id: string) => store.get<User>("users", id)!
const client = (id: string) => store.get<Client>("clients", id)!
const d = (n: number) => addDays(today(), n)

beforeEach(() => {
  store = new Store()
  seed(store)
})

describe("request → quote → order", () => {
  it("splits a request into one quote per partner", () => {
    const req = S.createRequest(store, user("u-c1"), client("c1"), {
      items: [{ offerId: "o1", transport: true }, { offerId: "o9" }, { offerId: "o10" }],
      from: d(5),
      to: d(9),
      siteId: "s1",
    })
    const quotes = req.quoteIds.map((id) => store.get<Quote>("quotes", id)!)
    // o1 and o9 belong to partner p1, o10 to p2.
    expect(quotes.map((q) => q.partnerId).sort()).toEqual(["p1", "p2"])
    expect(
      quotes.every((q) => q.status === "awaiting_partner" && q.versions[0].kind === "draft")
    ).toBe(true)
  })

  it("rejects a start date in the past", () => {
    expect(() =>
      S.createRequest(store, user("u-c1"), client("c1"), {
        items: [{ offerId: "o1" }],
        from: d(-1),
        to: d(2),
        siteId: "s1",
      })
    ).toThrow(S.ApiError)
  })

  it("only accepts the latest, complete version and locks the price in an order", () => {
    const req = S.createRequest(store, user("u-c1"), client("c1"), {
      items: [{ offerId: "o1", transport: true }],
      from: d(5),
      to: d(9),
      siteId: "s1",
    })
    let q = store.get<Quote>("quotes", req.quoteIds[0])!
    q = S.partnerRevise(store, user("u-p1"), q, { lines: q.versions[0].lines, validUntil: d(3) })
    expect(q.status).toBe("sent")
    expect(() => S.clientAccept(store, user("u-c1"), q, { version: 1, acceptTerms: true })).toThrow(
      /newer version/
    )
    const { quote, order } = S.clientAccept(store, user("u-c1"), q, {
      version: 2,
      acceptTerms: true,
    })
    expect(quote.status).toBe("accepted")
    expect(order.baseTotals.net).toBe(q.versions[1].totals.net)
    expect(order.payment.status).toBe("unpaid")
  })

  it("updates the agreed total and end date only when the customer accepts an extension", () => {
    const order = store.find<Order>("orders", (o) => o.status === "in_progress")[0]
    const change = order.changes.find((c) => c.status === "pending_approval")!
    const before = S.orderSummary(order)
    expect(before.pendingChangesNet).toBe(850)
    const after = S.clientDecideChange(store, user("u-c1"), order, change, true, {})
    expect(S.orderSummary(after).agreedNet).toBe(before.agreedNet + 850)
    expect(after.period.to).toBe(change.newTo)
  })

  it("keeps disputed charges out of the agreed total", () => {
    const order = store.find<Order>("orders", (o) => o.status === "in_progress")[0]
    const s = S.orderSummary(order)
    expect(s.contestedChargesNet).toBe(180)
    expect(s.chargesNet).toBe(0)
  })
})

describe("requestOverview", () => {
  it("is not confirmed while some parts are still open", () => {
    const quotes = [{ status: "accepted" }, { status: "awaiting_partner" }] as Quote[]
    expect(S.requestOverview(quotes)).toMatchObject({
      status: "partial",
      label: "Not confirmed: 1 of 2 parts still pending",
    })
  })

  it("is confirmed when every part is accepted", () => {
    expect(S.requestOverview([{ status: "accepted" }] as Quote[]).status).toBe("confirmed")
  })
})

describe("data separation", () => {
  const call = (userId: string, method: string, path: string) => {
    const login = { store, token: null, body: { userId }, query: {} }
    const { token } = dispatch(login, "POST", "/api/auth/demo-login") as SessionResult
    return dispatch({ store, token, body: {}, query: {} }, method, path)
  }

  it("hides another customer's requests", () => {
    const other = store.find<{ id: string; clientId: string }>(
      "requests",
      (r) => r.clientId === "c2"
    )[0]
    expect(() => call("u-c1", "GET", `/api/client/requests/${other.id}`)).toThrow(
      /Request not found/
    )
  })

  it("hides another partner's orders", () => {
    const order = store.find<Order>("orders", (o) => o.partnerId === "p1")[0]
    expect(() => call("u-p2", "GET", `/api/partner/orders/${order.id}`)).toThrow(/Order not found/)
  })

  it("blocks the wrong role", () => {
    expect(() => call("u-p1", "GET", "/api/client/summary")).toThrow(/another role/)
  })
})

describe("Store.transaction", () => {
  it("rolls back changes when the operation fails", () => {
    const before = store.all("quotes").length
    expect(() =>
      store.transaction(() => {
        S.createRequest(store, user("u-c1"), client("c1"), {
          items: [{ offerId: "o1" }],
          from: d(5),
          to: d(6),
          siteId: "s1",
        })
        throw new Error("boom")
      })
    ).toThrow("boom")
    expect(store.all("quotes").length).toBe(before)
  })
})
