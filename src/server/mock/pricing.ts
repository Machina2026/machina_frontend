import { randomBytes } from "node:crypto"

import type {
  Line,
  LineType,
  Offer,
  Partner,
  Prices,
  RequestItem,
  Accessory,
  Model,
  Period,
  Totals,
} from "@/lib/machina/types"

import { calendarDays, workingDays } from "./dates"
import { VAT_RATE } from "./meta"

// Quote draft calculation from offer rates and conditions. Used both for the
// offer comparison and for the drafts sent to partners. Lines that cannot be
// priced (e.g. transport "on quote") keep amount null and toConfirm true, so
// the total is "partial" and must not be shown as final.

export const newId = (prefix: string) => `${prefix}-${randomBytes(4).toString("hex")}`

export const round2 = (n: number) => Math.round(n * 100) / 100

const eurFmt = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" })
export const fmtEur = (n: number) => eurFmt.format(n)

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Cheapest combination of monthly (30 days), weekly (7 days) and daily rates.
 * Returns [amount, description]; amount is null when no rate applies.
 */
export function periodCost(rates: Partial<Prices>, days: number): [number | null, string] {
  const { day, week, month } = rates
  const options: [number, string][] = []
  if (day) options.push([day * days, `${plural(days, "day", "days")} × ${fmtEur(day)}`])

  // Whole months, then whole weeks, then leftover days; leftover days are
  // billed as one more week (or month) when that is cheaper.
  let rem = days
  let [m, w, d] = [0, 0, 0]
  let roundedUp = ""
  let ok = true
  if (month && rem >= 30) {
    m = Math.floor(rem / 30)
    rem -= m * 30
  }
  if (week && rem >= 7) {
    w = Math.floor(rem / 7)
    rem -= w * 7
  }
  if (rem) {
    if (day && (!week || rem * day <= week)) {
      d = rem
    } else if (week) {
      w += 1
      roundedUp = `a full week costs less than ${plural(rem, "extra day", "extra days")}`
    } else if (month) {
      m += 1
      roundedUp = `a full month costs less than ${plural(rem, "extra day", "extra days")}`
    } else {
      ok = false
    }
  }
  const parts = [
    m && plural(m, "month", "months"),
    w && plural(w, "week", "weeks"),
    d && plural(d, "day", "days"),
  ].filter(Boolean)
  if (ok && parts.length) {
    const amount = m * (month ?? 0) + w * (week ?? 0) + d * (day ?? 0)
    options.push([amount, parts.join(" + ") + (roundedUp ? ` (${roundedUp})` : "")])
  }
  if (month && days < 30) options.push([month, "1 month (monthly rate)"])
  if (week && days < 7) options.push([week, "1 week (weekly rate)"])
  if (!options.length) return [null, "rate on quote"]
  // First cheapest option wins, like Python's min().
  const best = options.reduce((a, b) => (b[0] < a[0] ? b : a))
  return [round2(best[0]), best[1]]
}

export function line(
  type: LineType,
  description: string,
  qty: number,
  unit: string,
  unitPrice: number | null,
  itemId: string | null = null,
  note = "",
  toConfirm = false
): Line {
  return {
    id: newId("ln"),
    type,
    description,
    qty,
    unit,
    unitPrice,
    amount: unitPrice === null ? null : round2(qty * unitPrice),
    toConfirm: toConfirm || unitPrice === null,
    note,
    itemId,
  }
}

type ItemForPricing = Pick<RequestItem, "id" | "qty" | "accessoryIds" | "transport" | "operator">

/** Draft lines for one machine (with accessories, operator and transport). */
export function itemLines(
  offer: Offer,
  model: Model,
  accessories: Record<string, Accessory>,
  partner: Partner,
  item: ItemForPricing,
  period: Period,
  siteProvince: string
): { lines: Line[]; info: string[]; warnings: string[] } {
  const qty = Math.max(1, Math.trunc(item.qty || 1))
  const days = calendarDays(period.from, period.to)
  const billed = Math.max(days, offer.minDays || 1)
  const lines: Line[] = []
  const info: string[] = []
  const warnings: string[] = []
  const label = `${model.brand} ${model.model}`

  const [amount, breakdown] = periodCost(offer.prices, billed)
  let note = breakdown
  if (billed > days) {
    note += ` — minimum rental of ${offer.minDays} days applied`
    warnings.push(
      `${label}: rental of ${days} days is shorter than the minimum (${offer.minDays} days).`
    )
  }
  lines.push(line("equipment", `Rental ${label}`, qty, "period", amount, item.id, note))

  const offered = new Map(offer.accessories.map((a) => [a.accessoryId, a]))
  for (const accId of item.accessoryIds ?? []) {
    const acc = accessories[accId]
    if (!acc) continue
    const rate = offered.get(accId)
    if (!rate) {
      warnings.push(`${label}: accessory "${acc.name}" is not offered by this partner.`)
      continue
    }
    let [aAmt, aNote] = periodCost({ day: rate.day, week: rate.week }, billed)
    if (rate.included) [aAmt, aNote] = [0, "included in the rental"]
    lines.push(line("accessory", acc.name, qty, "period", aAmt, item.id, aNote))
  }

  const op = offer.operator ?? { mode: "unavailable", pricePerDay: null }
  const wd = workingDays(period.from, period.to)
  if (op.mode === "included") {
    info.push(`${label}: wet hire — operator included in the rate.`)
  } else if (item.operator) {
    if (op.mode === "available" && op.pricePerDay) {
      lines.push(
        line(
          "operator",
          `Operator for ${label}`,
          qty * wd,
          "working days",
          op.pricePerDay,
          item.id,
          `${wd} working days (Mon–Fri), ${offer.hoursPerDay || 8} h/day`
        )
      )
    } else if (op.mode === "available" || op.mode === "on_quote") {
      lines.push(
        line(
          "operator",
          `Operator for ${label}`,
          qty * wd,
          "working days",
          null,
          item.id,
          "Operator rate on quote"
        )
      )
    } else {
      warnings.push(`${label}: this partner does not offer rental with an operator.`)
    }
  }

  const tr = offer.transport ?? { mode: "unavailable", price: null }
  const zones = offer.zones?.length ? offer.zones : (partner.zones ?? [])
  const inZone = zones.includes(siteProvince)
  if (item.transport) {
    if (tr.mode === "fixed" && tr.price !== null && inZone) {
      lines.push(
        line(
          "transport",
          `Round-trip transport ${label}`,
          qty,
          "round trip",
          tr.price,
          item.id,
          "Delivery and pickup on site"
        )
      )
    } else if (tr.mode === "fixed" || tr.mode === "on_quote") {
      const why = inZone ? "Transport on quote" : "Site outside the service area"
      lines.push(
        line("transport", `Round-trip transport ${label}`, qty, "round trip", null, item.id, why)
      )
    } else {
      warnings.push(
        `${label}: transport not available, the customer collects from the partner's depot.`
      )
    }
  } else {
    info.push(
      `${label}: the customer collects and returns the machine at ${partner.city || "the partner's depot"}.`
    )
  }
  if (!inZone) {
    warnings.push(
      `${label}: the site (${siteProvince || "?"}) is outside the partner's declared service area.`
    )
  }

  if (offer.hoursPerDay) {
    const extra = offer.extraHourPrice
    info.push(
      `${label}: ${offer.hoursPerDay} hours/day included${extra ? `; overtime ${fmtEur(extra)}/h billed at cost` : ""}.`
    )
  }
  if (offer.deposit)
    info.push(`${label}: deposit ${fmtEur(offer.deposit)} (not included in the total).`)
  info.push(`${label}: fuel excluded unless the partner states otherwise.`)
  return { lines, info, warnings }
}

export function totals(lines: Line[], vatRate = VAT_RATE): Totals {
  const known = lines
    .filter((l) => l.amount !== null && l.amount !== undefined)
    .map((l) => l.amount as number)
  const missing = lines.filter((l) => l.amount === null || l.amount === undefined).length
  const net = round2(known.reduce((s, n) => s + n, 0))
  const vat = round2((net * vatRate) / 100)
  return { net, vatRate, vat, gross: round2(net + vat), complete: missing === 0, missing }
}
