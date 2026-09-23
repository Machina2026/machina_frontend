import type {
  Accessory,
  ChangeKind,
  ChargeKind,
  Client,
  CommissionReport,
  DocType,
  EstimateGroup,
  InvoiceDraft,
  ItemInput,
  Line,
  LineType,
  Model,
  Needs,
  Offer,
  Order,
  OrderChange,
  OrderCharge,
  OrderSummary,
  Partner,
  Period,
  Quote,
  QuoteStatus,
  RentalRequest,
  RequestItem,
  RequestOverview,
  Settings,
  SiteRef,
  User,
  HistoryEntry,
} from "@/lib/machina/types"

import { addDays, calendarDays, now, today, validDate } from "./dates"
import { PROVINCE_IDS, VAT_RATE } from "./meta"
import { fmtEur, itemLines, newId, round2, totals } from "./pricing"
import type { Store } from "./store"

// Domain rules: requests, quotes, orders, changes, charges, documents.
// Role and ownership checks happen in the API layer before these are called;
// state transitions are validated here.

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields: Record<string, string> = {}
  ) {
    super(message)
  }
}

export type Errors = Record<string, string>
type Body = Record<string, unknown>

export const LINE_TYPES: LineType[] = ["equipment", "accessory", "operator", "transport", "service"]

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v))
const trimmed = (v: unknown, max: number) => str(v).trim().slice(0, max)

function nextCode(store: Store, prefix: string) {
  return `${prefix}-${new Date().getFullYear()}-${String(store.counter(prefix)).padStart(4, "0")}`
}

export function hist(doc: { history?: HistoryEntry[] }, actor: string, text: string) {
  ;(doc.history ??= []).push({ at: now(), actor, text })
}

export function actorLabel(store: Store, user: User) {
  const org =
    user.role === "partner"
      ? store.get<Partner>("partners", user.partnerId ?? "")
      : store.get<Client>("clients", user.clientId ?? "")
  return `${user.name} (${org ? org.name : "?"})`
}

/** Parse a number field; records an error and returns null when invalid. */
export function num(
  value: unknown,
  field: string,
  errors: Errors,
  {
    minimum,
    required = true,
    integer = false,
  }: { minimum?: number; required?: boolean; integer?: boolean } = {}
): number | null {
  if (value === null || value === undefined || value === "") {
    if (required) errors[field] = "Required"
    return null
  }
  const n = Number(typeof value === "string" ? value.trim() : value)
  if (!Number.isFinite(n) || (integer && !Number.isInteger(n))) {
    errors[field] = integer ? "Enter a whole number" : "Enter a valid number"
    return null
  }
  if (minimum !== undefined && n < minimum) {
    errors[field] = `Must be at least ${minimum}`
    return null
  }
  return n
}

export function validatePeriod(from: unknown, to: unknown, errors: Errors, allowPast = false) {
  if (!validDate(from)) errors.from = "Enter the start date"
  if (!validDate(to)) errors.to = "Enter the end date"
  if (errors.from || errors.to) return
  const f = from as string
  const t = to as string
  if (t < f) errors.to = "The end date must be after the start date"
  if (!allowPast && f < today()) errors.from = "The start date cannot be in the past"
  if (calendarDays(f, t) > 366) errors.to = "Maximum period is 12 months"
}

export function catalogMaps(store: Store) {
  const byId = <T extends { id: string }>(xs: T[]) =>
    Object.fromEntries(xs.map((x) => [x.id, x])) as Record<string, T>
  return {
    offers: byId(store.all<Offer>("offers")),
    models: byId(store.all<Model>("models")),
    accessories: byId(store.all<Accessory>("accessories")),
    partners: byId(store.all<Partner>("partners")),
  }
}

// ------------------------------------------------------------------ estimates
export function buildEstimate(
  store: Store,
  items: ItemInput[],
  period: Period,
  province: string
): EstimateGroup[] {
  const { offers, models, accessories, partners } = catalogMaps(store)
  const groups = new Map<string, EstimateGroup>()
  for (const raw of items) {
    const offer = offers[raw?.offerId]
    if (!offer || offer.active === false) continue
    const partner = partners[offer.partnerId]
    const model = models[offer.modelId]
    const item: RequestItem = {
      id: raw.id || newId("it"),
      offerId: offer.id,
      modelId: model.id,
      partnerId: partner.id,
      label: `${model.brand} ${model.model}`,
      category: model.category,
      qty: Math.max(1, Math.trunc(Number(raw.qty) || 1)),
      accessoryIds: (raw.accessoryIds ?? []).filter((a) => a in accessories),
      transport: Boolean(raw.transport),
      operator: Boolean(raw.operator),
    }
    const { lines, info, warnings } = itemLines(
      offer,
      model,
      accessories,
      partner,
      item,
      period,
      province
    )
    let g = groups.get(partner.id)
    if (!g) {
      g = {
        partnerId: partner.id,
        partnerName: partner.name,
        partnerCity: partner.city,
        items: [],
        lines: [],
        info: [],
        warnings: [],
        totals: totals([]),
      }
      groups.set(partner.id, g)
    }
    g.items.push(item)
    g.lines.push(...lines)
    g.info.push(...info)
    g.warnings.push(...warnings)
  }
  const result = [...groups.values()]
  for (const g of result) g.totals = totals(g.lines)
  return result
}

function siteFrom(client: Client, data: Body, errors: Errors): SiteRef | null {
  if (data.siteId) {
    const site = client.sites.find((s) => s.id === data.siteId)
    if (!site) {
      errors.siteId = "Site not found"
      return null
    }
    return {
      siteId: site.id,
      name: site.name,
      address: site.address,
      city: site.city,
      province: site.province,
    }
  }
  const s = (data.site ?? {}) as Record<string, unknown>
  if (!str(s.address).trim()) errors["site.address"] = "Address is required"
  if (!str(s.city).trim()) errors["site.city"] = "Town is required"
  if (!PROVINCE_IDS.includes(str(s.province)))
    errors["site.province"] = "Province not served (Piedmont only for now)"
  if (Object.keys(errors).length) return null
  return {
    siteId: null,
    name: str(s.name).trim() || str(s.address).trim(),
    address: str(s.address).trim(),
    city: str(s.city).trim(),
    province: str(s.province),
  }
}

// ------------------------------------------------------------------ requests
export function createRequest(
  store: Store,
  user: User,
  client: Client,
  data: Body,
  allowPast = false
): RentalRequest {
  const errors: Errors = {}
  const items = (Array.isArray(data.items) ? data.items : []) as ItemInput[]
  if (!items.length) errors.items = "Add at least one machine to the request"
  validatePeriod(data.from, data.to, errors, allowPast)
  const site = siteFrom(client, data, errors)
  if (Object.keys(errors).length || !site)
    throw new ApiError(400, "Check the highlighted fields", errors)

  const period: Period = { from: data.from as string, to: data.to as string }
  const groups = buildEstimate(store, items, period, site.province)
  if (!groups.length) {
    throw new ApiError(400, "No valid offers in the request", {
      items: "The selected offers are no longer available",
    })
  }
  const rawNeeds = (data.needs ?? {}) as Record<string, unknown>
  const needs: Needs = {
    accessWidth: trimmed(rawNeeds.accessWidth, 1000),
    ground: trimmed(rawNeeds.ground, 1000),
    schedule: trimmed(rawNeeds.schedule, 1000),
    notes: trimmed(rawNeeds.notes, 1000),
  }
  const actor = actorLabel(store, user)
  const req: RentalRequest = {
    id: newId("req"),
    code: nextCode(store, "REQ"),
    clientId: client.id,
    clientName: client.name,
    createdAt: now(),
    createdBy: actor,
    period,
    site,
    needs,
    jobDescription: trimmed(data.jobDescription, 4000),
    source: data.source === "assistant" ? "assistant" : "direct",
    items: [],
    quoteIds: [],
    history: [],
  }
  hist(
    req,
    actor,
    `Request created and sent to ${groups.length} partner${groups.length === 1 ? "" : "s"}`
  )
  for (const g of groups) {
    const q: Quote = {
      id: newId("q"),
      code: nextCode(store, "QUO"),
      requestId: req.id,
      requestCode: req.code,
      clientId: client.id,
      clientName: client.name,
      partnerId: g.partnerId,
      partnerName: g.partnerName,
      status: "awaiting_partner",
      createdAt: now(),
      period,
      site,
      needs,
      jobDescription: req.jobDescription,
      items: g.items,
      versions: [
        {
          n: 1,
          kind: "draft",
          author: "Machina — automatic draft from the catalogue",
          authorType: "machina",
          createdAt: now(),
          lines: g.lines,
          totals: g.totals,
          info: g.info,
          warnings: g.warnings,
          validUntil: null,
          note: "",
        },
      ],
      currentVersion: 1,
      acceptedVersion: null,
      history: [],
    }
    hist(
      q,
      actor,
      "Request received. Machina generated draft v1 from the catalogue rates and conditions."
    )
    store.put("quotes", q)
    req.items.push(...g.items)
    req.quoteIds.push(q.id)
  }
  store.put("requests", req)
  return req
}

export const currentVersion = (q: Quote) => q.versions[q.versions.length - 1]

/** Expire a sent quote whose validity has passed. */
export function refreshQuote(store: Store, q: Quote): Quote {
  if (q.status === "sent") {
    const vu = currentVersion(q).validUntil
    if (vu && vu < today()) {
      q.status = "expired"
      hist(q, "Machina", `Quote expired on ${vu} without being accepted.`)
      store.put("quotes", q)
    }
  }
  return q
}

export function requestOverview(quotes: Quote[]): RequestOverview {
  const counts: Partial<Record<QuoteStatus, number>> = {}
  for (const q of quotes) counts[q.status] = (counts[q.status] ?? 0) + 1
  const total = quotes.length
  const accepted = counts.accepted ?? 0
  const open = (counts.awaiting_partner ?? 0) + (counts.sent ?? 0)
  const closed = total - accepted - open
  const parts = (n: number) => (n === 1 ? "part" : "parts")
  let status: RequestOverview["status"]
  let label: string
  if (total && accepted === total) {
    status = "confirmed"
    label = "Confirmed: all parts accepted"
  } else if (accepted && open) {
    status = "partial"
    label = `Not confirmed: ${open} of ${total} ${parts(total)} still pending`
  } else if (accepted) {
    status = "partially_closed"
    label = `Partly confirmed: ${accepted} of ${total} parts accepted`
  } else if (open) {
    status = "in_progress"
    label = `In progress: ${open} of ${total} ${parts(total)} pending`
  } else {
    status = "closed"
    label = "Closed without orders"
  }
  return { status, label, counts, total, accepted, open, closed }
}

// ------------------------------------------------------------ quote actions
function cleanLines(raw: unknown, errors: Errors): Line[] {
  const out: Line[] = []
  if (!Array.isArray(raw) || !raw.length) {
    errors.lines = "The quote must contain at least one line"
    return out
  }
  raw.forEach((l: Record<string, unknown>, i) => {
    const pre = `lines.${i}.`
    const type = l.type as LineType
    if (!LINE_TYPES.includes(type)) errors[`${pre}type`] = "Invalid line type"
    const description = str(l.description).trim()
    if (!description) errors[`${pre}description`] = "Description is required"
    const qty = num(l.qty, `${pre}qty`, errors, { minimum: 0.01 })
    const price = num(l.unitPrice, `${pre}unitPrice`, errors, { minimum: 0 })
    if (qty === null || price === null) return
    out.push({
      id: str(l.id) || newId("ln"),
      type,
      description: description.slice(0, 300),
      qty,
      unit: str(l.unit).trim().slice(0, 30) || "pcs",
      unitPrice: round2(price),
      amount: round2(qty * price),
      toConfirm: false,
      note: str(l.note).trim().slice(0, 300),
      itemId: (l.itemId as string) ?? null,
    })
  })
  return out
}

const EDITABLE: QuoteStatus[] = ["awaiting_partner", "sent", "expired"]

export function partnerRevise(store: Store, user: User, q: Quote, data: Body): Quote {
  refreshQuote(store, q)
  if (!EDITABLE.includes(q.status)) {
    throw new ApiError(409, `The quote can no longer be changed (status: ${q.status}).`)
  }
  const errors: Errors = {}
  const lines = cleanLines(data.lines, errors)
  const vu = data.validUntil
  if (!validDate(vu)) errors.validUntil = "Enter the quote's expiry date"
  else if (vu < today()) errors.validUntil = "The expiry date cannot be in the past"
  else if (vu > q.period.to && vu > addDays(today(), 60))
    errors.validUntil = "Expiry date is too far away"
  if (Object.keys(errors).length) throw new ApiError(400, "Check the quote lines", errors)

  const prev = currentVersion(q)
  const n = prev.n + 1
  const actor = actorLabel(store, user)
  q.versions.push({
    n,
    kind: "quote",
    author: actor,
    authorType: "partner",
    createdAt: now(),
    lines,
    totals: totals(lines),
    info: prev.info ?? [],
    warnings: [],
    validUntil: vu as string,
    note: trimmed(data.note, 2000),
  })
  q.currentVersion = n
  const was = q.status
  q.status = "sent"
  hist(
    q,
    actor,
    was === "awaiting_partner"
      ? `Availability checked. Final quote v${n} approved and sent to the customer (valid until ${vu}).`
      : `New version v${n} sent: it replaces v${prev.n} and must be accepted by the customer.`
  )
  store.put("quotes", q)
  return q
}

export function partnerDecline(store: Store, user: User, q: Quote, data: Body): Quote {
  refreshQuote(store, q)
  if (!EDITABLE.includes(q.status))
    throw new ApiError(409, "The request can no longer be declined.")
  const reason = str(data.reason).trim()
  if (!reason) throw new ApiError(400, "Give a reason for declining", { reason: "Required" })
  q.status = "declined_by_partner"
  q.declineReason = reason.slice(0, 1000)
  hist(q, actorLabel(store, user), `Request declined by the partner: ${reason}`)
  store.put("quotes", q)
  return q
}

export function clientAccept(
  store: Store,
  user: User,
  q: Quote,
  data: Body
): { quote: Quote; order: Order } {
  refreshQuote(store, q)
  if (q.status === "expired")
    throw new ApiError(409, "The quote has expired: ask the partner to renew it.")
  if (q.status !== "sent") throw new ApiError(409, "The quote is not awaiting acceptance.")
  const v = currentVersion(q)
  if (Number(data.version) !== v.n) {
    throw new ApiError(409, `A newer version of the quote is available (v${v.n}). Reload the page.`)
  }
  if (!v.totals.complete) throw new ApiError(409, "The quote still contains lines to be priced.")
  if (!data.acceptTerms) {
    throw new ApiError(400, "Confirm you have read the quote lines and conditions", {
      acceptTerms: "Required",
    })
  }
  const actor = actorLabel(store, user)
  q.status = "accepted"
  q.acceptedVersion = v.n
  q.acceptance = { version: v.n, by: actor, at: now() }
  hist(q, actor, `Quote v${v.n} accepted. Price locked: ${fmtEur(v.totals.net)} + VAT.`)
  const order = createOrder(store, q, actor)
  q.orderId = order.id
  store.put("quotes", q)
  return { quote: q, order }
}

export function clientReject(store: Store, user: User, q: Quote, data: Body): Quote {
  refreshQuote(store, q)
  if (q.status !== "sent" && q.status !== "expired") {
    throw new ApiError(409, "The quote cannot be rejected in its current status.")
  }
  q.status = "rejected_by_client"
  q.rejectReason = trimmed(data.reason, 1000)
  hist(
    q,
    actorLabel(store, user),
    `Quote rejected by the customer${q.rejectReason ? `: ${q.rejectReason}` : "."}`
  )
  store.put("quotes", q)
  return q
}

export function clientWithdraw(store: Store, user: User, q: Quote): Quote {
  if (!EDITABLE.includes(q.status))
    throw new ApiError(409, "The request cannot be cancelled in its current status.")
  q.status = "withdrawn"
  hist(q, actorLabel(store, user), "Request cancelled by the customer.")
  store.put("quotes", q)
  return q
}

// -------------------------------------------------------------------- orders
function createOrder(store: Store, q: Quote, actor: string): Order {
  const v = currentVersion(q)
  const order: Order = {
    id: newId("ord"),
    code: nextCode(store, "ORD"),
    quoteId: q.id,
    quoteCode: q.code,
    requestId: q.requestId,
    requestCode: q.requestCode,
    clientId: q.clientId,
    clientName: q.clientName,
    partnerId: q.partnerId,
    partnerName: q.partnerName,
    createdAt: now(),
    period: { ...q.period },
    originalPeriod: { ...q.period },
    site: q.site,
    needs: q.needs,
    items: q.items,
    acceptedVersion: v.n,
    acceptance: q.acceptance!,
    lines: v.lines,
    baseTotals: v.totals,
    info: v.info ?? [],
    status: "confirmed",
    changes: [],
    charges: [],
    invoices: [],
    notices: [],
    payment: { status: "unpaid" },
    history: [],
  }
  hist(order, actor, `Order confirmed by accepting quote ${q.code} v${v.n}.`)
  store.put("orders", order)
  return order
}

const gross = (net: number) => round2(net * (1 + VAT_RATE / 100))

export function orderSummary(order: Order): OrderSummary {
  const sum = (xs: number[]) => xs.reduce((s, n) => s + n, 0)
  const base = order.baseTotals.net
  const chAcc = sum(
    order.changes.filter((c) => c.status === "accepted").map((c) => c.line?.amount ?? 0)
  )
  const chPend = sum(
    order.changes.filter((c) => c.status === "pending_approval").map((c) => c.line?.amount ?? 0)
  )
  const cgAcc = sum(order.charges.filter((c) => c.status === "accepted").map((c) => c.amount))
  const cgOpen = sum(
    order.charges.filter((c) => c.status === "pending_review").map((c) => c.amount)
  )
  const cgCont = sum(order.charges.filter((c) => c.status === "disputed").map((c) => c.amount))
  const net = round2(base + chAcc + cgAcc)
  const vat = round2((net * VAT_RATE) / 100)
  return {
    baseNet: base,
    changesNet: round2(chAcc),
    chargesNet: round2(cgAcc),
    agreedNet: net,
    vat,
    agreedGross: round2(net + vat),
    vatRate: VAT_RATE,
    pendingChangesNet: round2(chPend),
    pendingChargesNet: round2(cgOpen),
    contestedChargesNet: round2(cgCont),
  }
}

function ensureActive(order: Order) {
  if (order.status !== "confirmed" && order.status !== "in_progress") {
    throw new ApiError(
      409,
      `The order is ${order.status.replace("_", " ")}: no further changes are possible.`
    )
  }
}

const CHANGE_KINDS: ChangeKind[] = ["extension", "accessory", "service"]
const LINE_FOR_KIND: Record<ChangeKind, LineType> = {
  extension: "equipment",
  accessory: "accessory",
  service: "service",
}

function changeLine(data: Body, errors: Errors, kind: ChangeKind): Line | null {
  const description = str(data.description).trim()
  if (!description) errors.description = "Description is required"
  const qty = num(data.qty, "qty", errors, { minimum: 0.01 })
  const price = num(data.unitPrice, "unitPrice", errors, { minimum: 0 })
  if (qty === null || price === null || !description) return null
  return {
    id: newId("ln"),
    type: LINE_FOR_KIND[kind],
    description: description.slice(0, 300),
    qty,
    unit: str(data.unit || "days")
      .trim()
      .slice(0, 30),
    unitPrice: round2(price),
    amount: round2(qty * price),
    toConfirm: false,
    note: "",
  }
}

function checkNewTo(order: Order, kind: ChangeKind, newTo: unknown, errors: Errors) {
  if (kind !== "extension") return
  if (!validDate(newTo)) errors.newTo = "Enter the new end date"
  else if (newTo <= order.period.to) errors.newTo = `The new date must be after ${order.period.to}`
}

export function partnerProposeChange(store: Store, user: User, order: Order, data: Body): Order {
  ensureActive(order)
  const errors: Errors = {}
  const kind = data.kind as ChangeKind
  if (!CHANGE_KINDS.includes(kind))
    throw new ApiError(400, "Check the fields", { kind: "Invalid change type" })
  const reason = str(data.reason).trim()
  if (!reason) errors.reason = "Give a reason"
  checkNewTo(order, kind, data.newTo, errors)
  const ln = changeLine(data, errors, kind)
  let existing: OrderChange | undefined
  if (data.changeId) {
    existing = order.changes.find((c) => c.id === data.changeId)
    if (!existing || existing.status !== "requested_by_client") {
      throw new ApiError(409, "This change request no longer needs pricing.")
    }
  }
  if (Object.keys(errors).length || !ln) throw new ApiError(400, "Check the change fields", errors)
  const s = orderSummary(order)
  const actor = actorLabel(store, user)
  const change: OrderChange = existing ?? {
    id: newId("chg"),
    code: `CHG-${order.changes.length + 1}`,
    origin: "partner",
    createdAt: now(),
    createdBy: actor,
    kind,
    reason: "",
    newTo: null,
    line: null,
    status: "pending_approval",
  }
  Object.assign(change, {
    kind,
    reason: reason.slice(0, 1000),
    newTo: kind === "extension" ? (data.newTo as string) : null,
    line: ln,
    status: "pending_approval",
    pricedAt: now(),
    pricedBy: actor,
    prevNet: s.agreedNet,
    prevGross: s.agreedGross,
    newNet: round2(s.agreedNet + (ln.amount ?? 0)),
    newGross: gross(s.agreedNet + (ln.amount ?? 0)),
  })
  if (!existing) order.changes.push(change)
  hist(
    order,
    actor,
    `${change.code} ${kind} proposed: ${reason} (${fmtEur(ln.amount ?? 0)} + VAT). Awaiting customer approval.`
  )
  store.put("orders", order)
  return order
}

export function clientRequestChange(store: Store, user: User, order: Order, data: Body): Order {
  ensureActive(order)
  const errors: Errors = {}
  const kind = data.kind as ChangeKind
  if (!CHANGE_KINDS.includes(kind)) errors.kind = "Invalid change type"
  const reason = str(data.reason).trim()
  if (!reason) errors.reason = "Describe the change you need"
  checkNewTo(order, kind, data.newTo, errors)
  if (Object.keys(errors).length) throw new ApiError(400, "Check the request fields", errors)
  const actor = actorLabel(store, user)
  const change: OrderChange = {
    id: newId("chg"),
    code: `CHG-${order.changes.length + 1}`,
    origin: "client",
    kind,
    reason: reason.slice(0, 1000),
    newTo: kind === "extension" ? (data.newTo as string) : null,
    line: null,
    status: "requested_by_client",
    createdAt: now(),
    createdBy: actor,
  }
  order.changes.push(change)
  hist(
    order,
    actor,
    `${change.code} requested by the customer (${kind}): ${reason}. Awaiting the partner's price.`
  )
  store.put("orders", order)
  return order
}

export function partnerDeclineChange(
  store: Store,
  user: User,
  order: Order,
  change: OrderChange,
  data: Body
): Order {
  if (change.status !== "requested_by_client")
    throw new ApiError(409, "The change is not awaiting a price.")
  change.status = "declined_by_partner"
  change.declineReason = trimmed(data.reason, 500)
  hist(
    order,
    actorLabel(store, user),
    `${change.code} not accepted by the partner${change.declineReason ? `: ${change.declineReason}` : "."}`
  )
  store.put("orders", order)
  return order
}

export function clientDecideChange(
  store: Store,
  user: User,
  order: Order,
  change: OrderChange,
  accept: boolean,
  data: Body
): Order {
  if (change.status !== "pending_approval")
    throw new ApiError(409, "The change is not awaiting approval.")
  const actor = actorLabel(store, user)
  const s = orderSummary(order)
  change.decidedAt = now()
  change.decidedBy = actor
  if (accept) {
    change.status = "accepted"
    change.prevNet = s.agreedNet
    change.prevGross = s.agreedGross
    change.newNet = round2(s.agreedNet + (change.line?.amount ?? 0))
    change.newGross = gross(change.newNet)
    if (change.kind === "extension" && change.newTo) order.period.to = change.newTo
    hist(
      order,
      actor,
      `${change.code} accepted. Agreed total updated from ${fmtEur(change.prevGross)} to ${fmtEur(change.newGross)} (VAT included).`
    )
    if (order.invoices.length) {
      change.invoiceNotice = true
      order.notices.push({
        at: now(),
        changeId: change.id,
        text:
          `${change.code} accepted after invoice ${order.invoices.map((i) => i.number).join(", ")} was issued. ` +
          "The issued document is not changed: handle the related tax document separately (e.g. a supplementary invoice or a credit note).",
      })
    }
  } else {
    change.status = "rejected"
    change.rejectReason = trimmed(data.reason, 500)
    hist(order, actor, `${change.code} rejected by the customer. The agreed total is unchanged.`)
  }
  store.put("orders", order)
  return order
}

export const CHARGE_KINDS: Record<ChargeKind, string> = {
  damage: "Damage",
  fuel: "Fuel",
  cleaning: "Extra cleaning",
  other: "Other",
}

export function partnerAddCharge(
  store: Store,
  user: User,
  order: Order,
  data: Body,
  fileIds: string[]
): Order {
  if (order.status === "cancelled") throw new ApiError(409, "Order cancelled")
  const errors: Errors = {}
  const kind = data.kind as ChargeKind
  if (!(kind in CHARGE_KINDS)) errors.kind = "Invalid type"
  const description = str(data.description).trim()
  if (!description) errors.description = "Describe the charge"
  const amount = num(data.amount, "amount", errors, { minimum: 0.01 })
  if (Object.keys(errors).length || amount === null)
    throw new ApiError(400, "Check the charge fields", errors)
  const actor = actorLabel(store, user)
  const charge: OrderCharge = {
    id: newId("chr"),
    code: `CHR-${order.charges.length + 1}`,
    kind,
    description: description.slice(0, 2000),
    amount: round2(amount),
    attachments: fileIds,
    status: "pending_review",
    createdAt: now(),
    createdBy: actor,
    log: [],
  }
  charge.log.push({ at: now(), actor, text: `Charge recorded: ${fmtEur(charge.amount)} + VAT` })
  order.charges.push(charge)
  hist(
    order,
    actor,
    `${charge.code} (${CHARGE_KINDS[kind]}) recorded: ${fmtEur(charge.amount)} + VAT, awaiting the customer's review.`
  )
  store.put("orders", order)
  return order
}

export function clientDecideCharge(
  store: Store,
  user: User,
  order: Order,
  charge: OrderCharge,
  decision: "accept" | "dispute",
  data: Body
): Order {
  if (charge.status !== "pending_review")
    throw new ApiError(409, "The charge is not awaiting review.")
  const actor = actorLabel(store, user)
  const note = trimmed(data.note, 2000)
  if (decision === "dispute" && !note)
    throw new ApiError(400, "Explain why you are disputing the charge", { note: "Required" })
  charge.status = decision === "accept" ? "accepted" : "disputed"
  charge.clientNote = note
  charge.decidedAt = now()
  charge.log.push({
    at: now(),
    actor,
    text: (decision === "accept" ? "Accepted" : "Disputed") + (note ? `: ${note}` : ""),
  })
  if (decision === "accept") {
    hist(order, actor, `${charge.code} accepted: added to the agreed total.`)
    if (order.invoices.length) {
      order.notices.push({
        at: now(),
        text: `${charge.code} accepted after the invoice was issued: handle the related tax document separately.`,
      })
    }
  } else {
    hist(order, actor, `${charge.code} disputed by the customer: not included in the agreed total.`)
  }
  store.put("orders", order)
  return order
}

export function partnerUpdateCharge(
  store: Store,
  user: User,
  order: Order,
  charge: OrderCharge,
  data: Body
): Order {
  if (charge.status !== "disputed" && charge.status !== "pending_review")
    throw new ApiError(409, "The charge cannot be changed.")
  const actor = actorLabel(store, user)
  if (data.action === "withdraw") {
    charge.status = "withdrawn"
    charge.log.push({ at: now(), actor, text: "Charge withdrawn by the partner" })
    hist(order, actor, `${charge.code} withdrawn by the partner.`)
  } else {
    const errors: Errors = {}
    const amount = num(data.amount, "amount", errors, { minimum: 0.01 })
    if (amount === null) throw new ApiError(400, "Invalid amount", errors)
    const old = charge.amount
    charge.amount = round2(amount)
    charge.status = "pending_review"
    const note = str(data.note).trim()
    charge.log.push({
      at: now(),
      actor,
      text: `Amount revised from ${fmtEur(old)} to ${fmtEur(amount)}${note ? `: ${note}` : ""}`,
    })
    hist(
      order,
      actor,
      `${charge.code} revised: new amount ${fmtEur(amount)} + VAT, to be reviewed again.`
    )
  }
  store.put("orders", order)
  return order
}

export function partnerSetStatus(store: Store, user: User, order: Order, status: unknown): Order {
  const allowed: Record<string, string[]> = {
    confirmed: ["in_progress"],
    in_progress: ["completed"],
  }
  if (typeof status !== "string" || !(allowed[order.status] ?? []).includes(status)) {
    throw new ApiError(409, "Status change not allowed.")
  }
  order.status = status as Order["status"]
  hist(
    order,
    actorLabel(store, user),
    status === "in_progress"
      ? "Machines delivered: rental in progress."
      : "Machines collected: rental completed."
  )
  store.put("orders", order)
  return order
}

const DOC_TYPES: DocType[] = ["invoice", "supplementary_invoice", "credit_note"]

export function partnerUploadInvoice(
  store: Store,
  user: User,
  order: Order,
  data: Body,
  fileId: string | null,
  fileName: string | null
): Order {
  const errors: Errors = {}
  const number = str(data.number).trim()
  if (!number) errors.number = "Invoice number is required"
  if (!validDate(data.date)) errors.date = "Invoice date is required"
  const amount = num(data.amount, "amount", errors, { minimum: 0 })
  if (!fileId) errors.file = "Attach the issued document (PDF or XML)"
  const docType = DOC_TYPES.includes(data.docType as DocType)
    ? (data.docType as DocType)
    : "invoice"
  if (Object.keys(errors).length || amount === null || !fileId)
    throw new ApiError(400, "Check the invoice details", errors)
  const actor = actorLabel(store, user)
  const inv = {
    id: newId("inv"),
    docType,
    number: number.slice(0, 50),
    date: data.date as string,
    amount: round2(amount),
    fileId,
    fileName: fileName ?? "document",
    uploadedAt: now(),
    uploadedBy: actor,
    note: trimmed(data.note, 500),
  }
  order.invoices.push(inv)
  hist(
    order,
    actor,
    `Tax document no. ${inv.number} of ${inv.date} uploaded (${fmtEur(inv.amount)}). Issued with the partner's software; uploading it to Machina is not a submission to the SdI.`
  )
  store.put("orders", order)
  return order
}

export function clientDeclarePayment(store: Store, user: User, order: Order, data: Body): Order {
  if (order.payment.status === "received")
    throw new ApiError(409, "The partner has already confirmed receipt.")
  const errors: Errors = {}
  const amount = num(data.amount, "amount", errors, { minimum: 0.01 })
  if (!validDate(data.date)) errors.date = "Date is required"
  if (Object.keys(errors).length || amount === null)
    throw new ApiError(400, "Check the payment details", errors)
  const actor = actorLabel(store, user)
  order.payment = {
    status: "declared",
    declared: {
      amount: round2(amount),
      date: data.date as string,
      method: trimmed(data.method || "Bank transfer", 60),
      note: trimmed(data.note, 300),
      at: now(),
      by: actor,
    },
  }
  hist(
    order,
    actor,
    `Payment declared by the customer: ${fmtEur(amount)} on ${data.date}. Awaiting the partner's confirmation of receipt.`
  )
  store.put("orders", order)
  return order
}

export function partnerConfirmPayment(store: Store, user: User, order: Order, data: Body): Order {
  if (order.payment.status === "received") throw new ApiError(409, "Receipt already confirmed.")
  const errors: Errors = {}
  const amount = num(data.amount, "amount", errors, { minimum: 0.01 })
  if (!validDate(data.date)) errors.date = "Date is required"
  if (Object.keys(errors).length || amount === null)
    throw new ApiError(400, "Check the receipt details", errors)
  const actor = actorLabel(store, user)
  order.payment.status = "received"
  order.payment.confirmed = {
    amount: round2(amount),
    date: data.date as string,
    at: now(),
    by: actor,
  }
  hist(order, actor, `Payment receipt confirmed by the partner: ${fmtEur(amount)} on ${data.date}.`)
  store.put("orders", order)
  return order
}

// ------------------------------------------------------------------ documents
export function invoiceDraft(store: Store, order: Order): InvoiceDraft {
  const partner = store.get<Partner>("partners", order.partnerId)!
  const client = store.get<Client>("clients", order.clientId)!
  const lines: Line[] = order.lines.map((l) => ({
    ...l,
    origin: `Quote ${order.quoteCode} v${order.acceptedVersion}`,
  }))
  for (const c of order.changes) {
    if (c.status === "accepted" && c.line) {
      lines.push({
        ...c.line,
        origin: `Change ${c.code} accepted on ${(c.decidedAt ?? "").slice(0, 10)}`,
      })
    }
  }
  for (const c of order.charges) {
    if (c.status === "accepted") {
      lines.push({
        type: "service",
        description: `${CHARGE_KINDS[c.kind]}: ${c.description}`,
        qty: 1,
        unit: "flat rate",
        unitPrice: c.amount,
        amount: c.amount,
        origin: `Charge ${c.code} accepted`,
      })
    }
  }
  const s = orderSummary(order)
  const pick = <T extends object, K extends keyof T>(o: T, keys: K[]) =>
    Object.fromEntries(keys.map((k) => [k, o[k]])) as Pick<T, K>
  return {
    title: "DRAFT INVOICE — NOT VALID FOR TAX PURPOSES",
    generatedAt: now(),
    orderCode: order.code,
    quoteCode: order.quoteCode,
    acceptedVersion: order.acceptedVersion,
    issuer: pick(partner, ["name", "vat", "address", "city", "province", "email", "pec", "phone"]),
    customer: pick(client, ["name", "vat", "address", "city", "province", "pec", "sdi", "email"]),
    period: order.period,
    originalPeriod: order.originalPeriod,
    site: order.site,
    lines,
    totals: { net: s.agreedNet, vatRate: s.vatRate, vat: s.vat, gross: s.agreedGross },
    excluded: {
      pendingChanges: s.pendingChangesNet,
      contestedCharges: s.contestedChargesNet,
      pendingCharges: s.pendingChargesNet,
    },
    invoicesIssued: order.invoices.map((i) => ({ number: i.number, date: i.date })),
    disclaimer:
      "Courtesy document generated by Machina. Tax numbering and issuing are the rental company's responsibility, using its own software. This is not an invoice and is not sent to the SdI (Italian e-invoicing exchange).",
  }
}

export function commissionReport(store: Store, partner: Partner): CommissionReport {
  const settings = store.get<Settings>("settings", "main")!
  const plan = settings.plans.find((p) => p.id === partner.planId) ?? settings.plans[0]
  const rows = store
    .find<Order>("orders", (o) => o.partnerId === partner.id && o.status !== "cancelled")
    .map((o) => {
      const s = orderSummary(o)
      const base = round2(s.baseNet + s.changesNet)
      return {
        orderId: o.id,
        code: o.code,
        client: o.clientName,
        createdAt: o.createdAt,
        status: o.status,
        base,
        rate: plan.commissionRate,
        commission: round2(base * plan.commissionRate),
      }
    })
  return {
    plan,
    plans: settings.plans,
    rows,
    totalCommission: round2(rows.reduce((s, r) => s + r.commission, 0)),
    note: settings.hypothesisNote,
  }
}
