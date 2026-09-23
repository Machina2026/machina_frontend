import { describe, expect, it } from "vitest"

import type { Model, Offer, Partner } from "@/lib/machina/types"

import { itemLines, periodCost, totals } from "./pricing"

describe("periodCost", () => {
  const rates = { day: 110, week: 480, month: 1400 }

  it("picks the cheapest mix of monthly, weekly and daily rates", () => {
    // 10 days: 1 week + 3 days (480 + 330) beats 10 × 110 and a whole month.
    expect(periodCost(rates, 10)).toEqual([810, "1 week + 3 days"])
  })

  it("uses a whole week when leftover days cost more than a week", () => {
    // 13 days: 1 week + 6 days would be 480 + 660; two weeks (960) is cheaper.
    expect(periodCost(rates, 13)).toEqual([960, "1 week + 1 week (for 6 remaining days)"])
  })

  it("offers the monthly rate for shorter periods when it is cheaper", () => {
    expect(periodCost({ day: 100, week: null, month: 1500 }, 20)).toEqual([
      1500,
      "1 month (monthly rate)",
    ])
  })

  it("returns null when there is no rate", () => {
    expect(periodCost({ day: null, week: null, month: null }, 5)).toEqual([null, "rate on quote"])
  })
})

describe("itemLines", () => {
  const model = { brand: "Kubota", model: "KX019-4" } as Model
  const partner = { city: "Turin", zones: ["TO"] } as Partner
  const offer = {
    prices: { day: 100, week: null, month: null },
    minDays: 3,
    hoursPerDay: 8,
    extraHourPrice: null,
    deposit: null,
    accessories: [],
    transport: { mode: "fixed", price: 120 },
    operator: { mode: "on_quote", pricePerDay: null },
    zones: ["TO"],
  } as unknown as Offer
  const item = { id: "it-1", qty: 1, accessoryIds: [], transport: true, operator: true }
  const period = { from: "2030-06-03", to: "2030-06-04" } // Mon–Tue: 2 days, 2 working days

  it("applies the minimum rental and prices transport inside the service area", () => {
    const { lines, warnings } = itemLines(offer, model, {}, partner, item, period, "TO")
    expect(lines[0]).toMatchObject({ type: "equipment", amount: 300 })
    expect(warnings[0]).toContain("shorter than the minimum")
    expect(lines.find((l) => l.type === "transport")).toMatchObject({ amount: 120 })
  })

  it("leaves operator on quote and out-of-area transport unpriced", () => {
    const { lines, warnings } = itemLines(offer, model, {}, partner, item, period, "CN")
    expect(lines.find((l) => l.type === "operator")).toMatchObject({
      qty: 2,
      amount: null,
      toConfirm: true,
    })
    expect(lines.find((l) => l.type === "transport")).toMatchObject({
      amount: null,
      note: "Site outside the service area",
    })
    expect(warnings.some((w) => w.includes("outside the partner's declared service area"))).toBe(
      true
    )
  })
})

describe("totals", () => {
  it("flags a partial total when some lines are unpriced", () => {
    const t = totals([
      { type: "equipment", description: "a", qty: 1, unit: "", unitPrice: 100, amount: 100 },
      { type: "transport", description: "b", qty: 1, unit: "", unitPrice: null, amount: null },
    ])
    expect(t).toEqual({ net: 100, vatRate: 22, vat: 22, gross: 122, complete: false, missing: 1 })
  })
})
