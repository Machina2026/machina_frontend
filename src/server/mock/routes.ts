import { randomBytes } from "node:crypto"

import type {
  Accessory,
  Client,
  DemoAccount,
  FileMeta,
  Model,
  Offer,
  OfferAccessory,
  Order,
  OrderView,
  Partner,
  PartnerPublic,
  PublicModel,
  PublicOffer,
  Quote,
  RentalRequest,
  Settings,
  Site,
  User,
  ImportRow,
} from "@/lib/machina/types"

import { runAssistant } from "./assistant"
import {
  checkPassword,
  createSession,
  deleteSession,
  hashPassword,
  publicUser,
  userForToken,
} from "./auth"
import { calendarDays, now, validDate } from "./dates"
import { CATEGORIES, PROVINCES, PROVINCE_IDS, SPEC_FILTERS, SPEC_SCHEMA, VAT_RATE } from "./meta"
import { itemLines, periodCost, totals } from "./pricing"
import { DEMO_PASSWORD, seed } from "./seed"
import * as S from "./services"
import { ApiError, type Errors } from "./services"
import type { Store } from "./store"

// REST routes. Each route declares the role it requires; data ownership
// (client/partner) is checked here, server side, on every read and write.

type Body = Record<string, unknown>
type RouteRole = "client" | "partner" | "any" | null

export type Ctx = {
  store: Store
  user: User | null
  token: string | null
  body: Body
  query: Record<string, string>
}

/** Special results the HTTP layer turns into cookies or binary responses. */
export type FileResult = { kind: "file"; meta: FileMeta; content: Buffer }
export type SessionResult = { kind: "session"; token: string; role: User["role"]; body: unknown }
export type LogoutResult = { kind: "logout"; body: unknown }
export type RouteResult = FileResult | SessionResult | LogoutResult | unknown

type Handler = (ctx: Ctx, ...params: string[]) => RouteResult
const ROUTES: { method: string; rx: RegExp; role: RouteRole; fn: Handler }[] = []

function route(method: string, pattern: string, role: RouteRole, fn: Handler) {
  ROUTES.push({ method, rx: new RegExp(`^${pattern}$`), role, fn })
}

export function dispatch(ctx: Omit<Ctx, "user">, method: string, path: string): RouteResult {
  for (const r of ROUTES) {
    if (r.method !== method) continue
    const m = path.match(r.rx)
    if (!m) continue
    const user = userForToken(ctx.store, ctx.token)
    if (r.role && !user) throw new ApiError(401, "Please sign in")
    if (r.role && r.role !== "any" && user!.role !== r.role)
      throw new ApiError(403, "This area is reserved for another role")
    return r.fn({ ...ctx, user }, ...m.slice(1))
  }
  throw new ApiError(404, "Resource not found")
}

// ------------------------------------------------------------------ helpers
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v))
const newToken = (prefix: string, bytes = 4) => `${prefix}-${randomBytes(bytes).toString("hex")}`

const partnerOf = (ctx: Ctx) => ctx.store.get<Partner>("partners", ctx.user!.partnerId ?? "")!
const clientOf = (ctx: Ctx) => ctx.store.get<Client>("clients", ctx.user!.clientId ?? "")!

type Upload = { name?: string; mime?: string; data?: string }
const ALL_UPLOADS = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/xml",
  "text/xml",
]

function saveUpload(
  store: Store,
  up: unknown,
  meta: Partial<FileMeta>,
  allowed = ALL_UPLOADS
): FileMeta | null {
  const u = (up ?? {}) as Upload
  if (!u.data) return null
  const mime = u.mime ?? ""
  if (!allowed.includes(mime)) {
    throw new ApiError(400, `File type not allowed (${mime || "unknown"})`, {
      file: "File type not allowed",
    })
  }
  const raw = Buffer.from(u.data.split(",").pop() ?? "", "base64")
  if (!raw.length)
    throw new ApiError(400, "File could not be read", { file: "File could not be read" })
  if (raw.length > 5 * 1024 * 1024)
    throw new ApiError(400, "File too large (max 5 MB)", { file: "Max 5 MB" })
  const name = (u.name ?? "file").replace(/[^\w.\- ]/g, "_").slice(0, 120)
  return store.putFile(newToken("f", 8), { ...meta, name, mime }, raw)
}

const partnerPublic = (p: Partner): PartnerPublic => ({
  id: p.id,
  name: p.name,
  city: p.city,
  province: p.province,
  zones: p.zones,
  verified: p.verified,
  demo: p.demo,
})

function offerPublic(
  o: Offer,
  partners: Record<string, Partner>,
  accessories: Record<string, Accessory>
): PublicOffer {
  return {
    ...o,
    partner: partnerPublic(partners[o.partnerId]),
    accessories: o.accessories
      .filter((a) => a.accessoryId in accessories)
      .map((a) => ({ ...a, name: accessories[a.accessoryId].name })),
  }
}

function modelPublic(m: Model): PublicModel {
  const specList = (SPEC_SCHEMA[m.category] ?? [])
    .filter((f) => m.specs[f.key] !== undefined && m.specs[f.key] !== "")
    .map((f) => ({ key: f.key, label: f.label, unit: f.unit, value: m.specs[f.key] }))
  return { ...m, specList }
}

function ownOrder(ctx: Ctx, id: string): Order {
  const o = ctx.store.get<Order>("orders", id)
  const u = ctx.user!
  if (
    !o ||
    (u.role === "client" && o.clientId !== u.clientId) ||
    (u.role === "partner" && o.partnerId !== u.partnerId)
  ) {
    throw new ApiError(404, "Order not found")
  }
  return o
}

function ownQuote(ctx: Ctx, id: string): Quote {
  const q = ctx.store.get<Quote>("quotes", id)
  const u = ctx.user!
  if (
    !q ||
    (u.role === "client" && q.clientId !== u.clientId) ||
    (u.role === "partner" && q.partnerId !== u.partnerId)
  ) {
    throw new ApiError(404, "Quote not found")
  }
  return S.refreshQuote(ctx.store, q)
}

function orderView(store: Store, o: Order): OrderView {
  const out: OrderView = { ...o, summary: S.orderSummary(o) }
  out.charges = o.charges.map((c) => ({
    ...c,
    files: c.attachments.map((f) => store.fileMeta(f)).filter((f): f is FileMeta => f !== null),
  }))
  return out
}

const findChange = (o: Order, id: string) => {
  const c = o.changes.find((x) => x.id === id)
  if (!c) throw new ApiError(404, "Change not found")
  return c
}
const findCharge = (o: Order, id: string) => {
  const c = o.charges.find((x) => x.id === id)
  if (!c) throw new ApiError(404, "Charge not found")
  return c
}

function sessionFor(store: Store, u: User): SessionResult {
  return {
    kind: "session",
    token: createSession(store, u.id),
    role: u.role,
    body: { user: publicUser(u) },
  }
}

// ------------------------------------------------------------------- public
route("GET", "/api/meta", null, ({ store }) => ({
  categories: CATEGORIES,
  specSchema: SPEC_SCHEMA,
  specFilters: SPEC_FILTERS,
  provinces: PROVINCES,
  accessories: store.all<Accessory>("accessories"),
  settings: store.get<Settings>("settings", "main"),
  aiMode: "demo",
  vatRate: VAT_RATE,
}))

route("GET", "/api/catalog", null, ({ store, query: q }) => {
  const { offers, models, partners } = S.catalogMaps(store)
  const period =
    validDate(q.from) && validDate(q.to) && q.to >= q.from ? { from: q.from, to: q.to } : null
  const text = (q.q ?? "").toLowerCase().trim()
  const catOrder = CATEGORIES.map((c) => c.id)
  const results = []
  for (const m of Object.values(models)) {
    if (q.cat && m.category !== q.cat) continue
    if (q.sub && m.subtype !== q.sub) continue
    if (
      text &&
      !`${m.brand} ${m.model} ${m.description} ${m.jobs.join(" ")}`.toLowerCase().includes(text)
    )
      continue
    let ok = true
    for (const f of SPEC_FILTERS) {
      const raw = q[`spec_${f.key}`]
      if (!raw) continue
      const v = Number(raw.replace(",", "."))
      if (!Number.isFinite(v)) continue
      const sv = m.specs[f.key]
      if (typeof sv !== "number" || (f.op === "max" && sv > v) || (f.op === "min" && sv < v))
        ok = false
    }
    if (!ok) continue
    const mo = []
    for (const o of Object.values(offers)) {
      if (o.modelId !== m.id || o.active === false) continue
      if (q.prov && !o.zones.includes(q.prov)) continue
      if (q.operator === "1" && o.operator.mode === "unavailable") continue
      const day = o.prices.day ?? 0
      if (q.pmin && Number.isFinite(Number(q.pmin)) && day < Number(q.pmin)) continue
      if (q.pmax && Number.isFinite(Number(q.pmax)) && day > Number(q.pmax)) continue
      let estimate: number | null = null
      if (period)
        estimate = periodCost(
          o.prices,
          Math.max(calendarDays(period.from, period.to), o.minDays || 1)
        )[0]
      mo.push({
        offerId: o.id,
        partner: partnerPublic(partners[o.partnerId]),
        day: o.prices.day,
        week: o.prices.week,
        month: o.prices.month,
        estimate,
        operator: o.operator.mode,
        transport: o.transport.mode,
      })
    }
    if (!mo.length) continue
    mo.sort((a, b) => (a.day ?? 1e9) - (b.day ?? 1e9))
    results.push({ model: modelPublic(m), offers: mo })
  }
  results.sort(
    (a, b) =>
      catOrder.indexOf(a.model.category) - catOrder.indexOf(b.model.category) ||
      a.model.brand.localeCompare(b.model.brand)
  )
  return { results, period }
})

route("GET", "/api/models/([\\w-]+)", null, ({ store }, id) => {
  const { offers, models, accessories, partners } = S.catalogMaps(store)
  const m = models[id]
  if (!m) throw new ApiError(404, "Model not found")
  const mo = Object.values(offers)
    .filter((o) => o.modelId === id && o.active !== false)
    .map((o) => offerPublic(o, partners, accessories))
    .sort((a, b) => (a.prices.day ?? 1e9) - (b.prices.day ?? 1e9))
  return {
    model: modelPublic(m),
    offers: mo,
    accessories: Object.values(accessories).filter((a) => a.compatibleModelIds.includes(id)),
  }
})

route("GET", "/api/accessories", null, ({ store }) => {
  const { offers, models, accessories, partners } = S.catalogMaps(store)
  return {
    accessories: Object.values(accessories).map((a) => ({
      ...a,
      compatibleModels: a.compatibleModelIds
        .filter((id) => id in models)
        .map((id) => ({ id, label: `${models[id].brand} ${models[id].model}` })),
      availability: Object.values(offers).flatMap((o) =>
        o.active === false
          ? []
          : o.accessories
              .filter((oa) => oa.accessoryId === a.id)
              .map((oa) => ({
                offerId: o.id,
                modelId: o.modelId,
                model: `${models[o.modelId].brand} ${models[o.modelId].model}`,
                partner: partners[o.partnerId].name,
                day: oa.day,
                week: oa.week,
                included: Boolean(oa.included),
              }))
      ),
    })),
  }
})

function periodAndProvince(b: Body, message: string) {
  const errors: Errors = {}
  S.validatePeriod(b.from, b.to, errors)
  if (!PROVINCE_IDS.includes(str(b.province))) errors.province = "Select the site's province"
  if (Object.keys(errors).length) throw new ApiError(400, message, errors)
  return { period: { from: b.from as string, to: b.to as string }, province: b.province as string }
}

route("POST", "/api/compare", null, ({ store, body: b }) => {
  const { period, province } = periodAndProvince(
    b,
    "Enter the period and province to compare offers"
  )
  const { offers, models, accessories, partners } = S.catalogMaps(store)
  const ids = (Array.isArray(b.offerIds) ? b.offerIds : []).slice(0, 6) as string[]
  const results = []
  for (const oid of ids) {
    const o = offers[oid]
    if (!o) continue
    const m = models[o.modelId]
    const p = partners[o.partnerId]
    const item = {
      id: `cmp-${o.id}`,
      qty: Math.trunc(Number(b.qty) || 1),
      accessoryIds: ((b.accessoryIds ?? []) as string[]).filter((x) => x in accessories),
      transport: Boolean(b.transport),
      operator: Boolean(b.operator),
    }
    const { lines, info, warnings } = itemLines(o, m, accessories, p, item, period, province)
    const offeredAcc = new Set(o.accessories.map((x) => x.accessoryId))
    const missing = item.accessoryIds
      .filter((x) => !offeredAcc.has(x))
      .map((x) => accessories[x].name)
    if (item.operator && o.operator.mode === "unavailable") missing.push("Operator")
    if (item.transport && o.transport.mode === "unavailable") missing.push("Transport")
    const pub = offerPublic(o, partners, accessories)
    const included = lines.filter((l) => l.amount !== null).map((l) => l.description)
    if (o.operator.mode === "included") included.push("Operator included (wet hire)")
    included.push(...pub.accessories.filter((x) => x.included).map((x) => x.name))
    const toConfirm = lines
      .filter((l) => l.amount === null)
      .map((l) => `${l.description} — ${l.note}`)
    toConfirm.push("Availability in the period")
    results.push({
      offer: pub,
      model: modelPublic(m),
      lines,
      totals: totals(lines),
      info,
      warnings,
      included,
      missing,
      toConfirm,
      inZone: o.zones.includes(province),
      days: calendarDays(period.from, period.to),
    })
  }
  return { period, results }
})

route("POST", "/api/estimate", null, ({ store, body: b }) => {
  const { period, province } = periodAndProvince(
    b,
    "Complete the period and site to calculate the draft"
  )
  return { groups: S.buildEstimate(store, (b.items ?? []) as never[], period, province) }
})

route("POST", "/api/assistant", null, ({ store, body }) => {
  const msg = str(body.message).trim()
  if (!msg) throw new ApiError(400, "Write a message")
  return runAssistant(store, msg.slice(0, 2000), (body.state ?? null) as never)
})

route("GET", "/api/files/([\\w-]+)", null, ({ store, token }, id) => {
  const f = store.getFile(id)
  if (!f) throw new ApiError(404, "File not found")
  if (!f.meta.public) {
    const u = userForToken(store, token)
    if (!u) throw new ApiError(401, "Please sign in")
    const allowed =
      (u.role === "client" && f.meta.clientId === u.clientId) ||
      (u.role === "partner" && f.meta.partnerId === u.partnerId)
    if (!allowed) throw new ApiError(404, "File not found")
  }
  return { kind: "file", meta: f.meta, content: f.content } satisfies FileResult
})

// ------------------------------------------------------------------- access
route("POST", "/api/auth/login", null, ({ store, body }) => {
  const email = str(body.email).trim().toLowerCase()
  const u = store.all<User>("users").find((x) => x.email === email)
  if (!u || !checkPassword(str(body.password), u.password))
    throw new ApiError(401, "Incorrect email or password")
  return sessionFor(store, u)
})

route("POST", "/api/auth/demo-login", null, ({ store, body }) => {
  const u = store.get<User>("users", str(body.userId))
  if (!u || !u.demo) throw new ApiError(404, "Demo account not found")
  return sessionFor(store, u)
})

route("GET", "/api/demo/accounts", null, ({ store }) => {
  const accounts: DemoAccount[] = store
    .all<User>("users")
    .filter((u) => u.demo)
    .map((u) => {
      const org =
        u.role === "partner"
          ? store.get<Partner>("partners", u.partnerId ?? "")
          : store.get<Client>("clients", u.clientId ?? "")
      return { ...publicUser(u), org: org?.name ?? "?" }
    })
  return { accounts, password: DEMO_PASSWORD }
})

route("POST", "/api/auth/logout", null, ({ store, token }) => {
  deleteSession(store, token)
  return { kind: "logout", body: { ok: true } } satisfies LogoutResult
})

route("GET", "/api/auth/me", "any", (ctx) => {
  const u = ctx.user!
  const org = u.role === "partner" ? partnerOf(ctx) : clientOf(ctx)
  return { user: publicUser(u), org: { id: org.id, name: org.name } }
})

route("POST", "/api/auth/register", null, ({ store, body: b }) => {
  const errors: Errors = {}
  const role = b.role
  if (role !== "client" && role !== "partner") errors.role = "Choose the account type"
  const required: [string, string][] = [
    ["companyName", "Company name"],
    ["address", "Address"],
    ["city", "Town"],
    ["name", "Contact name"],
    ["phone", "Phone"],
  ]
  for (const [k, label] of required) if (!str(b[k]).trim()) errors[k] = `${label} is required`
  const vat = str(b.vat).replace(/\s/g, "").toUpperCase()
  if (!/^(IT)?\d{11}$/.test(vat)) errors.vat = "Invalid VAT number (11 digits)"
  if (!PROVINCE_IDS.includes(str(b.province)))
    errors.province = "Province not served (Piedmont only for now)"
  const email = str(b.email).trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.email = "Invalid email"
  else if (store.all<User>("users").some((u) => u.email === email))
    errors.email = "Email already registered"
  if (str(b.password).length < 8) errors.password = "At least 8 characters"
  const zones = ((b.zones ?? []) as string[]).filter((z) => PROVINCE_IDS.includes(z))
  if (role === "partner" && !zones.length) errors.zones = "Select at least one province served"
  if (!b.acceptTerms) errors.acceptTerms = "Required"
  if (Object.keys(errors).length) throw new ApiError(400, "Check the highlighted fields", errors)

  const orgId = newToken(role === "partner" ? "p" : "c")
  const base = {
    id: orgId,
    name: str(b.companyName).trim(),
    vat,
    address: str(b.address).trim(),
    city: str(b.city).trim(),
    province: str(b.province),
    email,
    pec: str(b.pec).trim(),
    phone: str(b.phone).trim(),
    createdAt: now(),
    demo: false,
  }
  if (role === "partner") {
    store.put<Partner>("partners", {
      ...base,
      zones,
      planId: "base",
      verified: false,
      conditions: "",
      attachments: [],
    })
  } else {
    store.put<Client>("clients", { ...base, sdi: str(b.sdi).trim(), sites: [] })
  }
  const u: User = {
    id: newToken("u"),
    email,
    name: str(b.name).trim(),
    role: role as User["role"],
    clientId: role === "client" ? orgId : null,
    partnerId: role === "partner" ? orgId : null,
    password: hashPassword(str(b.password)),
    demo: false,
  }
  store.put("users", u)
  return sessionFor(store, u)
})

route("POST", "/api/demo/reset", null, ({ store }) => {
  seed(store)
  return { kind: "logout", body: { ok: true } } satisfies LogoutResult
})

route("PUT", "/api/demo/settings", null, ({ store, body }) => {
  const st = store.get<Settings>("settings", "main")!
  const errors: Errors = {}
  ;((body.plans ?? []) as Record<string, unknown>[]).forEach((p, i) => {
    const plan = st.plans.find((x) => x.id === p.id)
    if (!plan) return
    const monthly = S.num(p.monthly, `plans.${i}.monthly`, errors, { minimum: 0 })
    const rate = S.num(p.commissionRate, `plans.${i}.commissionRate`, errors, { minimum: 0 })
    if (rate !== null && rate > 0.5) errors[`plans.${i}.commissionRate`] = "Maximum 50%"
    if (!Object.keys(errors).length && monthly !== null && rate !== null) {
      plan.monthly = monthly
      plan.commissionRate = rate
    }
  })
  if (Object.keys(errors).length) throw new ApiError(400, "Invalid values", errors)
  store.put("settings", st)
  return st
})

// ------------------------------------------------------------------- client
route("GET", "/api/client/summary", "client", (ctx) => {
  const cid = ctx.user!.clientId
  const quotes = ctx.store
    .find<Quote>("quotes", (q) => q.clientId === cid)
    .map((q) => S.refreshQuote(ctx.store, q))
  const orders = ctx.store.find<Order>("orders", (o) => o.clientId === cid)
  const actions = []
  for (const q of quotes) {
    if (q.status === "sent") {
      actions.push({
        kind: "quote",
        text: `Quote ${q.code} from ${q.partnerName} to review (expires ${S.currentVersion(q).validUntil})`,
        link: `/buyer/quotes/${q.id}`,
      })
    }
  }
  for (const o of orders) {
    for (const c of o.changes) {
      if (c.status === "pending_approval")
        actions.push({
          kind: "change",
          text: `${c.code} on ${o.code}: ${c.kind} to approve`,
          link: `/buyer/orders/${o.id}`,
        })
    }
    for (const c of o.charges) {
      if (c.status === "pending_review")
        actions.push({
          kind: "charge",
          text: `${c.code} on ${o.code} to review`,
          link: `/buyer/orders/${o.id}`,
        })
    }
  }
  return {
    counts: {
      quotesToEvaluate: quotes.filter((q) => q.status === "sent").length,
      waitingPartner: quotes.filter((q) => q.status === "awaiting_partner").length,
      activeOrders: orders.filter((o) => o.status === "confirmed" || o.status === "in_progress")
        .length,
      changesToApprove: orders
        .flatMap((o) => o.changes)
        .filter((c) => c.status === "pending_approval").length,
      chargesToVerify: orders.flatMap((o) => o.charges).filter((c) => c.status === "pending_review")
        .length,
      paymentsOpen: orders.filter((o) => o.payment.status === "unpaid" && o.status !== "cancelled")
        .length,
    },
    actions,
    recentOrders: orders
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
      .map((o) => ({ ...o, summary: S.orderSummary(o) })),
  }
})

route("GET", "/api/client/company", "client", (ctx) => clientOf(ctx))

route("PUT", "/api/client/company", "client", (ctx) => {
  const c = clientOf(ctx)
  const b = ctx.body
  const errors: Errors = {}
  for (const k of ["name", "address", "city"]) if (!str(b[k]).trim()) errors[k] = "Required"
  if (!PROVINCE_IDS.includes(str(b.province))) errors.province = "Invalid province"
  if (Object.keys(errors).length) throw new ApiError(400, "Check the fields", errors)
  for (const k of [
    "name",
    "vat",
    "address",
    "city",
    "province",
    "email",
    "pec",
    "sdi",
    "phone",
  ] as const) {
    if (k in b) c[k] = str(b[k]).trim().slice(0, 200)
  }
  ctx.store.put("clients", c)
  return c
})

function siteFields(b: Body): Omit<Site, "id"> {
  const errors: Errors = {}
  for (const [k, label] of [
    ["name", "Site name"],
    ["address", "Address"],
    ["city", "Town"],
  ] as const) {
    if (!str(b[k]).trim()) errors[k] = `${label} is required`
  }
  if (!PROVINCE_IDS.includes(str(b.province))) errors.province = "Province not served"
  if (Object.keys(errors).length) throw new ApiError(400, "Check the site details", errors)
  const t = (k: string) => str(b[k]).trim().slice(0, 300)
  return {
    name: t("name"),
    address: t("address"),
    city: t("city"),
    province: t("province"),
    notes: t("notes"),
  }
}

route("POST", "/api/client/sites", "client", (ctx) => {
  const c = clientOf(ctx)
  const site: Site = { ...siteFields(ctx.body), id: newToken("s") }
  c.sites.push(site)
  ctx.store.put("clients", c)
  return site
})

route("PUT", "/api/client/sites/([\\w-]+)", "client", (ctx, sid) => {
  const c = clientOf(ctx)
  const site = c.sites.find((s) => s.id === sid)
  if (!site) throw new ApiError(404, "Site not found")
  Object.assign(site, siteFields(ctx.body))
  ctx.store.put("clients", c)
  return site
})

route("DELETE", "/api/client/sites/([\\w-]+)", "client", (ctx, sid) => {
  const c = clientOf(ctx)
  c.sites = c.sites.filter((s) => s.id !== sid)
  ctx.store.put("clients", c)
  return { ok: true }
})

route("GET", "/api/client/requests", "client", (ctx) => {
  const cid = ctx.user!.clientId
  const requests = ctx.store
    .find<RentalRequest>("requests", (r) => r.clientId === cid)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((r) => {
      const quotes = r.quoteIds.map((id) =>
        S.refreshQuote(ctx.store, ctx.store.get<Quote>("quotes", id)!)
      )
      return {
        ...r,
        overview: S.requestOverview(quotes),
        parts: quotes.map((q) => ({
          id: q.id,
          code: q.code,
          partnerName: q.partnerName,
          status: q.status,
        })),
      }
    })
  return { requests }
})

route("GET", "/api/client/requests/([\\w-]+)", "client", (ctx, id) => {
  const r = ctx.store.get<RentalRequest>("requests", id)
  if (!r || r.clientId !== ctx.user!.clientId) throw new ApiError(404, "Request not found")
  const quotes = r.quoteIds.map((qid) =>
    S.refreshQuote(ctx.store, ctx.store.get<Quote>("quotes", qid)!)
  )
  return { ...r, overview: S.requestOverview(quotes), quotes }
})

route("POST", "/api/client/requests", "client", (ctx) =>
  S.createRequest(ctx.store, ctx.user!, clientOf(ctx), ctx.body)
)

route("GET", "/api/client/quotes/([\\w-]+)", "client", (ctx, id) => ownQuote(ctx, id))

route(
  "POST",
  "/api/client/quotes/([\\w-]+)/(accept|reject|withdraw)",
  "client",
  (ctx, id, action) => {
    const q = ownQuote(ctx, id)
    if (action === "accept") {
      const r = S.clientAccept(ctx.store, ctx.user!, q, ctx.body)
      return { quote: r.quote, orderId: r.order.id }
    }
    if (action === "reject") return { quote: S.clientReject(ctx.store, ctx.user!, q, ctx.body) }
    return { quote: S.clientWithdraw(ctx.store, ctx.user!, q) }
  }
)

route("GET", "/api/client/orders", "client", (ctx) => {
  const cid = ctx.user!.clientId
  const orders = ctx.store
    .find<Order>("orders", (o) => o.clientId === cid)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((o) => ({ ...o, summary: S.orderSummary(o) }))
  return { orders }
})

route("GET", "/api/client/orders/([\\w-]+)", "client", (ctx, id) => {
  const o = orderView(ctx.store, ownOrder(ctx, id))
  // Tax notices are internal to the partner.
  return { ...o, notices: [] }
})

route("POST", "/api/client/orders/([\\w-]+)/changes", "client", (ctx, id) =>
  orderView(ctx.store, S.clientRequestChange(ctx.store, ctx.user!, ownOrder(ctx, id), ctx.body))
)

route(
  "POST",
  "/api/client/orders/([\\w-]+)/changes/([\\w-]+)/(accept|reject)",
  "client",
  (ctx, id, cid, action) => {
    const o = ownOrder(ctx, id)
    return orderView(
      ctx.store,
      S.clientDecideChange(
        ctx.store,
        ctx.user!,
        o,
        findChange(o, cid),
        action === "accept",
        ctx.body
      )
    )
  }
)

route(
  "POST",
  "/api/client/orders/([\\w-]+)/charges/([\\w-]+)/(accept|dispute)",
  "client",
  (ctx, id, cid, action) => {
    const o = ownOrder(ctx, id)
    return orderView(
      ctx.store,
      S.clientDecideCharge(
        ctx.store,
        ctx.user!,
        o,
        findCharge(o, cid),
        action as "accept" | "dispute",
        ctx.body
      )
    )
  }
)

route("POST", "/api/client/orders/([\\w-]+)/payment", "client", (ctx, id) =>
  orderView(ctx.store, S.clientDeclarePayment(ctx.store, ctx.user!, ownOrder(ctx, id), ctx.body))
)

route("GET", "/api/client/documents", "client", (ctx) => {
  const cid = ctx.user!.clientId
  const documents = ctx.store
    .find<Order>("orders", (o) => o.clientId === cid)
    .map((o) => ({
      orderId: o.id,
      code: o.code,
      partnerName: o.partnerName,
      period: o.period,
      status: o.status,
      summary: S.orderSummary(o),
      invoices: o.invoices,
      payment: o.payment,
    }))
    .sort((a, b) => b.code.localeCompare(a.code))
  return { documents }
})

// ------------------------------------------------------------ shared documents
route("GET", "/api/orders/([\\w-]+)/invoice-draft", "any", (ctx, id) =>
  S.invoiceDraft(ctx.store, ownOrder(ctx, id))
)

// ------------------------------------------------------------------ partner
route("GET", "/api/partner/summary", "partner", (ctx) => {
  const pid = ctx.user!.partnerId
  const quotes = ctx.store
    .find<Quote>("quotes", (q) => q.partnerId === pid)
    .map((q) => S.refreshQuote(ctx.store, q))
  const orders = ctx.store.find<Order>("orders", (o) => o.partnerId === pid)
  const actions = []
  for (const q of quotes) {
    if (q.status === "awaiting_partner") {
      actions.push({
        kind: "request",
        text: `Request ${q.code} from ${q.clientName} to review`,
        link: `/supplier/quotes/${q.id}`,
      })
    }
  }
  for (const o of orders) {
    const link = `/supplier/orders/${o.id}`
    for (const c of o.changes) {
      if (c.status === "requested_by_client")
        actions.push({
          kind: "change",
          text: `${c.code} on ${o.code}: customer request to price`,
          link,
        })
    }
    for (const c of o.charges) {
      if (c.status === "disputed")
        actions.push({
          kind: "charge",
          text: `${c.code} on ${o.code} disputed by the customer`,
          link,
        })
    }
    if (o.payment.status === "declared")
      actions.push({
        kind: "payment",
        text: `Payment declared on ${o.code}: confirm receipt`,
        link,
      })
    for (const n of o.notices) actions.push({ kind: "tax", text: `${o.code}: ${n.text}`, link })
  }
  return {
    counts: {
      newRequests: quotes.filter((q) => q.status === "awaiting_partner").length,
      awaitingClient: quotes.filter((q) => q.status === "sent").length,
      activeOrders: orders.filter((o) => o.status === "confirmed" || o.status === "in_progress")
        .length,
      changesOpen: orders
        .flatMap((o) => o.changes)
        .filter((c) => c.status === "requested_by_client" || c.status === "pending_approval")
        .length,
      chargesContested: orders.flatMap((o) => o.charges).filter((c) => c.status === "disputed")
        .length,
      invoicesMissing: orders.filter((o) => o.status !== "cancelled" && !o.invoices.length).length,
      offers: ctx.store.find<Offer>("offers", (o) => o.partnerId === pid).length,
    },
    actions,
  }
})

route("GET", "/api/partner/profile", "partner", (ctx) => {
  const p = partnerOf(ctx)
  return { ...p, attachmentsMeta: p.attachments.map((f) => ctx.store.fileMeta(f)).filter(Boolean) }
})

route("PUT", "/api/partner/profile", "partner", (ctx) => {
  const p = partnerOf(ctx)
  const b = ctx.body
  const errors: Errors = {}
  for (const k of ["name", "address", "city", "email", "phone"])
    if (!str(b[k]).trim()) errors[k] = "Required"
  const zones = ((b.zones ?? []) as string[]).filter((z) => PROVINCE_IDS.includes(z))
  if (!zones.length) errors.zones = "Select at least one province"
  if (!PROVINCE_IDS.includes(str(b.province))) errors.province = "Invalid province"
  if (Object.keys(errors).length) throw new ApiError(400, "Check the fields", errors)
  for (const k of [
    "name",
    "vat",
    "address",
    "city",
    "province",
    "email",
    "pec",
    "phone",
    "conditions",
  ] as const) {
    if (k in b) p[k] = str(b[k]).trim().slice(0, 3000)
  }
  p.zones = zones
  ctx.store.put("partners", p)
  return p
})

route("POST", "/api/partner/attachments", "partner", (ctx) => {
  const p = partnerOf(ctx)
  const meta = saveUpload(
    ctx.store,
    ctx.body.file,
    { partnerId: p.id, public: false, kind: "catalogue" },
    ["application/pdf"]
  )
  if (!meta) throw new ApiError(400, "Select a PDF", { file: "Required" })
  p.attachments.push(meta.id)
  ctx.store.put("partners", p)
  return meta
})

route("PUT", "/api/partner/plan", "partner", (ctx) => {
  const st = ctx.store.get<Settings>("settings", "main")!
  if (!st.plans.some((p) => p.id === ctx.body.planId)) throw new ApiError(400, "Invalid plan")
  const p = partnerOf(ctx)
  p.planId = ctx.body.planId as string
  ctx.store.put("partners", p)
  return { ok: true }
})

route("GET", "/api/partner/offers", "partner", (ctx) => {
  const pid = ctx.user!.partnerId!
  const models = Object.fromEntries(ctx.store.all<Model>("models").map((m) => [m.id, m]))
  const accessories = Object.fromEntries(
    ctx.store.all<Accessory>("accessories").map((a) => [a.id, a])
  )
  const offers = ctx.store
    .find<Offer>("offers", (o) => o.partnerId === pid)
    .map((o) => ({
      ...o,
      model: modelPublic(models[o.modelId]),
      accessoryNames: Object.fromEntries(
        o.accessories
          .filter((a) => a.accessoryId in accessories)
          .map((a) => [a.accessoryId, accessories[a.accessoryId].name])
      ),
    }))
  return {
    offers,
    models: Object.values(models)
      .filter((m) => m.owner === "machina" || m.owner === pid)
      .map(modelPublic),
  }
})

function ownOffer(ctx: Ctx, id: string): Offer {
  const o = ctx.store.get<Offer>("offers", id)
  if (!o || o.partnerId !== ctx.user!.partnerId) throw new ApiError(404, "Offer not found")
  return o
}

route("GET", "/api/partner/offers/([\\w-]+)", "partner", (ctx, id) => {
  const o = ownOffer(ctx, id)
  const m = ctx.store.get<Model>("models", o.modelId)!
  return {
    ...o,
    model: modelPublic(m),
    photosMeta: o.photos.map((f) => ctx.store.fileMeta(f)).filter(Boolean),
  }
})

const lines = (v: unknown) =>
  (Array.isArray(v) ? v : str(v).split("\n"))
    .map((x) => str(x).trim())
    .filter(Boolean)
    .slice(0, 12)

function validateModel(b: Body, errors: Errors, owner: string): Omit<Model, "id"> | null {
  const category = str(b.category)
  if (!(category in SPEC_SCHEMA)) errors["model.category"] = "Category is required"
  if (!str(b.brand).trim()) errors["model.brand"] = "Brand is required"
  if (!str(b.model).trim()) errors["model.model"] = "Model is required"
  if (!str(b.description).trim()) errors["model.description"] = "Description is required"
  if (Object.keys(errors).length) return null
  const specs: Model["specs"] = {}
  const rawSpecs = (b.specs ?? {}) as Record<string, unknown>
  for (const f of SPEC_SCHEMA[category]) {
    const v = rawSpecs[f.key]
    if (v === null || v === undefined || v === "") continue
    if (f.type === "num") {
      const n = S.num(str(v).replace(",", "."), `model.specs.${f.key}`, errors, { minimum: 0 })
      if (n !== null) specs[f.key] = n
    } else {
      specs[f.key] = str(v).trim().slice(0, 100)
    }
  }
  const cat = CATEGORIES.find((c) => c.id === category)!
  return {
    category,
    subtype: cat.subtypes.includes(str(b.subtype)) ? str(b.subtype) : cat.subtypes[0],
    brand: str(b.brand).trim().slice(0, 60),
    model: str(b.model).trim().slice(0, 80),
    description: str(b.description).trim().slice(0, 1500),
    specs,
    jobs: lines(b.jobs),
    limits: lines(b.limits),
    image: cat.image,
    owner,
    demo: false,
  }
}

const TRANSPORT_MODES = ["fixed", "on_quote", "unavailable"]
const OPERATOR_MODES = ["available", "on_quote", "unavailable", "included"]

function validateOffer(
  ctx: Ctx,
  b: Body,
  modelId: string,
  existing?: Offer
): Omit<Offer, "id"> & { id?: string } {
  const errors: Errors = {}
  const pr = (b.prices ?? {}) as Record<string, unknown>
  const day = S.num(pr.day, "prices.day", errors, { minimum: 1 })
  const week = S.num(pr.week, "prices.week", errors, { minimum: 1, required: false })
  const month = S.num(pr.month, "prices.month", errors, { minimum: 1, required: false })
  const minDays = S.num(b.minDays || 1, "minDays", errors, { minimum: 1, integer: true })
  const hours = S.num(b.hoursPerDay || 8, "hoursPerDay", errors, { minimum: 1 })
  const extra = S.num(b.extraHourPrice, "extraHourPrice", errors, { minimum: 0, required: false })
  const deposit = S.num(b.deposit, "deposit", errors, { minimum: 0, required: false })
  const units = S.num(b.units || 1, "units", errors, { minimum: 1, integer: true })
  const tr = (b.transport ?? {}) as Record<string, unknown>
  if (!TRANSPORT_MODES.includes(str(tr.mode))) errors["transport.mode"] = "Select an option"
  const tprice = S.num(tr.price, "transport.price", errors, {
    minimum: 0,
    required: tr.mode === "fixed",
  })
  const op = (b.operator ?? {}) as Record<string, unknown>
  if (!OPERATOR_MODES.includes(str(op.mode))) errors["operator.mode"] = "Select an option"
  const oprice = S.num(op.pricePerDay, "operator.pricePerDay", errors, {
    minimum: 0,
    required: false,
  })
  const zones = ((b.zones ?? []) as string[]).filter((z) => PROVINCE_IDS.includes(z))
  if (!zones.length) errors.zones = "Select at least one province served"
  const validAcc = new Set(
    ctx.store
      .find<Accessory>("accessories", (a) => a.compatibleModelIds.includes(modelId))
      .map((a) => a.id)
  )
  const accs: OfferAccessory[] = []
  ;((b.accessories ?? []) as Record<string, unknown>[]).forEach((a, i) => {
    if (!validAcc.has(str(a.accessoryId))) return
    const included = Boolean(a.included)
    const ad = S.num(a.day, `accessories.${i}.day`, errors, { minimum: 0, required: !included })
    const aw = S.num(a.week, `accessories.${i}.week`, errors, { minimum: 0, required: false })
    accs.push({ accessoryId: str(a.accessoryId), day: ad ?? 0, week: aw, included })
  })
  if (Object.keys(errors).length) throw new ApiError(400, "Check the highlighted fields", errors)
  const conditions = (Array.isArray(b.conditions) ? b.conditions : str(b.conditions).split("\n"))
    .map((c) => str(c).trim())
    .filter(Boolean)
    .slice(0, 15)
  return {
    ...(existing ?? { photos: [], demo: false }),
    partnerId: ctx.user!.partnerId!,
    modelId,
    prices: { day, week, month },
    minDays: minDays!,
    hoursPerDay: hours!,
    extraHourPrice: extra,
    deposit,
    units: units!,
    transport: { mode: tr.mode as Offer["transport"]["mode"], price: tprice },
    operator: { mode: op.mode as Offer["operator"]["mode"], pricePerDay: oprice },
    zones,
    accessories: accs,
    active: b.active === undefined ? true : Boolean(b.active),
    conditions,
    notes: str(b.notes).trim().slice(0, 1000),
    availability: "To be confirmed by the partner",
  }
}

route("POST", "/api/partner/offers", "partner", (ctx) => {
  const b = ctx.body
  const pid = ctx.user!.partnerId!
  let modelId: string
  let offer
  if (b.newModel) {
    const errors: Errors = {}
    const m = validateModel(b.newModel as Body, errors, pid)
    if (!m) throw new ApiError(400, "Check the model details", errors)
    modelId = newToken("m")
    offer = validateOffer(ctx, b, modelId)
    ctx.store.put<Model>("models", { ...m, id: modelId })
  } else {
    const m = ctx.store.get<Model>("models", str(b.modelId))
    if (!m || (m.owner !== "machina" && m.owner !== pid)) {
      throw new ApiError(400, "Select a model or create a new one", { modelId: "Required" })
    }
    modelId = m.id
    offer = validateOffer(ctx, b, modelId)
  }
  const saved: Offer = { ...offer, id: newToken("o") }
  ctx.store.put("offers", saved)
  return saved
})

route("PUT", "/api/partner/offers/([\\w-]+)", "partner", (ctx, id) => {
  const o = ownOffer(ctx, id)
  const m = ctx.store.get<Model>("models", o.modelId)!
  if (ctx.body.model && m.owner === ctx.user!.partnerId) {
    const errors: Errors = {}
    const upd = validateModel(
      { ...(ctx.body.model as Body), category: m.category },
      errors,
      m.owner
    )
    if (!upd) throw new ApiError(400, "Check the model details", errors)
    ctx.store.put("models", { ...m, ...upd })
  }
  const saved = { ...validateOffer(ctx, ctx.body, o.modelId, o), id: o.id } as Offer
  ctx.store.put("offers", saved)
  return saved
})

route("POST", "/api/partner/offers/([\\w-]+)/photos", "partner", (ctx, id) => {
  const o = ownOffer(ctx, id)
  const meta = saveUpload(
    ctx.store,
    ctx.body.file,
    { partnerId: o.partnerId, public: true, kind: "photo" },
    ["image/jpeg", "image/png", "image/webp"]
  )
  if (!meta) throw new ApiError(400, "Select an image", { file: "Required" })
  o.photos.push(meta.id)
  ctx.store.put("offers", o)
  return meta
})

route("DELETE", "/api/partner/offers/([\\w-]+)/photos/([\\w-]+)", "partner", (ctx, id, fid) => {
  const o = ownOffer(ctx, id)
  o.photos = o.photos.filter((f) => f !== fid)
  ctx.store.put("offers", o)
  return { ok: true }
})

route("PUT", "/api/partner/prices", "partner", (ctx) => {
  const errors: Errors = {}
  const updated: Offer[] = []
  ;((ctx.body.rows ?? []) as Record<string, unknown>[]).forEach((row, i) => {
    const o = ownOffer(ctx, str(row.offerId))
    const day = S.num(row.day, `${i}.day`, errors, { minimum: 1 })
    const week = S.num(row.week, `${i}.week`, errors, { minimum: 1, required: false })
    const month = S.num(row.month, `${i}.month`, errors, { minimum: 1, required: false })
    const tprice = S.num(row.transport, `${i}.transport`, errors, { minimum: 0, required: false })
    if (Object.keys(errors).length) return
    o.prices = { day, week, month }
    if (o.transport.mode === "fixed" && tprice !== null) o.transport.price = tprice
    o.active = row.active === undefined ? true : Boolean(row.active)
    updated.push(o)
  })
  if (Object.keys(errors).length) throw new ApiError(400, "Some prices are not valid", errors)
  updated.forEach((o) => ctx.store.put("offers", o))
  return { updated: updated.length }
})

// ---------------------------------------------------------------- CSV import
export const CSV_COLUMNS = [
  "category",
  "subtype",
  "brand",
  "model",
  "description",
  "price_day",
  "price_week",
  "price_month",
  "min_days",
  "hours_per_day",
  "transport",
  "transport_price",
  "operator",
  "operator_price_day",
  "deposit",
  "weight_kg",
  "width_mm",
  "dig_depth_m",
  "height_m",
  "load_kg",
  "power_kw",
  "power_kva",
  "conditions",
]

/** Minimal RFC 4180 parser: quoted fields, doubled quotes, CRLF. */
function parseCsvRows(text: string, delim: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === delim) {
      row.push(field)
      field = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else field += ch
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim()))
}

type ParsedRow = ImportRow & {
  parsed: null | {
    category: string
    subtype: string
    brand: string
    model: string
    description: string
    specs: Model["specs"]
    modelId: string | null
    offerId: string | null
    offer: Pick<
      Offer,
      | "prices"
      | "minDays"
      | "hoursPerDay"
      | "transport"
      | "operator"
      | "deposit"
      | "zones"
      | "conditions"
      | "active"
    >
  }
}

function parseCsv(ctx: Ctx, text: string): ParsedRow[] {
  const pid = ctx.user!.partnerId!
  const partner = partnerOf(ctx)
  if (!text.trim()) throw new ApiError(400, "The CSV file is empty", { csv: "Empty" })
  const sample = text.split("\n", 1)[0]
  const delim = (sample.match(/;/g)?.length ?? 0) >= (sample.match(/,/g)?.length ?? 0) ? ";" : ","
  const [headerRow, ...dataRows] = parseCsvRows(text, delim)
  const header = (headerRow ?? []).map((h) => h.trim().toLowerCase())
  const missing = ["category", "brand", "model", "price_day"].filter((c) => !header.includes(c))
  if (missing.length)
    throw new ApiError(400, `Missing required columns: ${missing.join(", ")}`, {
      csv: "Invalid header",
    })

  const models = ctx.store.all<Model>("models")
  const myOffers = ctx.store.find<Offer>("offers", (o) => o.partnerId === pid)
  const catByName: Record<string, string> = {}
  for (const c of CATEGORIES) {
    catByName[c.id] = c.id
    catByName[c.name.toLowerCase()] = c.id
  }
  const rows: ParsedRow[] = dataRows.map((cells, idx) => {
    const r: Record<string, string> = {}
    header.forEach((h, i) => (r[h] = (cells[i] ?? "").trim()))
    const errors: Errors = {}
    const cat = catByName[(r.category ?? "").toLowerCase()]
    if (!cat) errors.category = "Unknown category"
    if (!r.brand) errors.brand = "Required"
    if (!r.model) errors.model = "Required"
    // Accept "1.234,5" (Italian) as well as "1234.5".
    const dec = (k: string) => {
      const v = r[k] ?? ""
      return /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(v)
        ? v.replace(/\./g, "").replace(",", ".")
        : v.replace(",", ".")
    }
    const day = S.num(dec("price_day"), "price_day", errors, { minimum: 1 })
    const week = S.num(dec("price_week"), "price_week", errors, { minimum: 1, required: false })
    const month = S.num(dec("price_month"), "price_month", errors, { minimum: 1, required: false })
    const minDays = S.num(r.min_days || "1", "min_days", errors, { minimum: 1, integer: true })
    const hours = S.num(dec("hours_per_day") || "8", "hours_per_day", errors, { minimum: 1 })
    const tmode = (r.transport || "on_quote").toLowerCase().replace(/ /g, "_")
    if (!TRANSPORT_MODES.includes(tmode)) errors.transport = "Use fixed, on_quote or unavailable"
    const tprice = S.num(dec("transport_price"), "transport_price", errors, {
      minimum: 0,
      required: tmode === "fixed",
    })
    const omode = (r.operator || "unavailable").toLowerCase().replace(/ /g, "_")
    if (!OPERATOR_MODES.includes(omode)) errors.operator = "Invalid value"
    const oprice = S.num(dec("operator_price_day"), "operator_price_day", errors, {
      minimum: 0,
      required: false,
    })
    const deposit = S.num(dec("deposit"), "deposit", errors, { minimum: 0, required: false })
    const specs: Model["specs"] = {}
    if (cat) {
      for (const f of SPEC_SCHEMA[cat]) {
        if (!r[f.key]) continue
        if (f.type === "num") {
          const v = S.num(dec(f.key), f.key, errors, { minimum: 0 })
          if (v !== null) specs[f.key] = v
        } else specs[f.key] = r[f.key]
      }
    }
    const match = models.find(
      (m) =>
        m.brand.toLowerCase() === (r.brand ?? "").toLowerCase() &&
        m.model.toLowerCase() === (r.model ?? "").toLowerCase() &&
        (m.owner === "machina" || m.owner === pid)
    )
    const existing = match ? myOffers.find((o) => o.modelId === match.id) : undefined
    const action = existing
      ? "update prices"
      : match
        ? "new offer on existing model"
        : "new model and offer"
    const valid = !Object.keys(errors).length
    return {
      line: idx + 2,
      data: r,
      errors,
      valid,
      action,
      parsed: valid
        ? {
            category: cat,
            subtype: r.subtype ?? "",
            brand: r.brand,
            model: r.model,
            description: r.description || `${r.brand} ${r.model}`,
            specs,
            modelId: match?.id ?? null,
            offerId: existing?.id ?? null,
            offer: {
              prices: { day, week, month },
              minDays: minDays!,
              hoursPerDay: hours!,
              transport: { mode: tmode as Offer["transport"]["mode"], price: tprice },
              operator: { mode: omode as Offer["operator"]["mode"], pricePerDay: oprice },
              deposit,
              zones: partner.zones,
              conditions: (r.conditions ?? "")
                .split("|")
                .map((c) => c.trim())
                .filter(Boolean),
              active: true,
            },
          }
        : null,
    }
  })
  if (!rows.length) throw new ApiError(400, "No data rows in the CSV", { csv: "Empty" })
  return rows
}

route("POST", "/api/partner/import/preview", "partner", (ctx) => {
  const rows = parseCsv(ctx, str(ctx.body.csv))
  return {
    rows: rows.map(({ line, data, errors, valid, action }) => ({
      line,
      data,
      errors,
      valid,
      action,
    })),
    valid: rows.filter((r) => r.valid).length,
    invalid: rows.filter((r) => !r.valid).length,
    columns: CSV_COLUMNS,
  }
})

route("POST", "/api/partner/import/commit", "partner", (ctx) => {
  const rows = parseCsv(ctx, str(ctx.body.csv))
  const pid = ctx.user!.partnerId!
  let done = 0
  for (const r of rows) {
    if (!r.valid || !r.parsed) continue
    const p = r.parsed
    let modelId = p.modelId
    if (!modelId) {
      const errors: Errors = {}
      const m = validateModel(
        {
          category: p.category,
          subtype: p.subtype,
          brand: p.brand,
          model: p.model,
          description: p.description,
          specs: p.specs,
        },
        errors,
        pid
      )
      if (!m) continue
      modelId = newToken("m")
      ctx.store.put<Model>("models", { ...m, id: modelId })
    }
    if (p.offerId) {
      const o = ctx.store.get<Offer>("offers", p.offerId)!
      Object.assign(o, {
        prices: p.offer.prices,
        transport: p.offer.transport,
        operator: p.offer.operator,
        minDays: p.offer.minDays,
        deposit: p.offer.deposit,
      })
      ctx.store.put("offers", o)
    } else {
      ctx.store.put<Offer>("offers", {
        ...p.offer,
        id: newToken("o"),
        partnerId: pid,
        modelId,
        accessories: [],
        photos: [],
        units: 1,
        extraHourPrice: null,
        notes: "Imported from CSV",
        availability: "To be confirmed by the partner",
        demo: false,
      })
    }
    done++
  }
  return { imported: done, skipped: rows.length - done }
})

route("GET", "/api/partner/quotes", "partner", (ctx) => {
  const pid = ctx.user!.partnerId
  const quotes = ctx.store
    .find<Quote>("quotes", (q) => q.partnerId === pid)
    .map((q) => S.refreshQuote(ctx.store, q))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return { quotes }
})

route("GET", "/api/partner/quotes/([\\w-]+)", "partner", (ctx, id) => ownQuote(ctx, id))

route("POST", "/api/partner/quotes/([\\w-]+)/(revise|decline)", "partner", (ctx, id, action) => {
  const q = ownQuote(ctx, id)
  return action === "revise"
    ? S.partnerRevise(ctx.store, ctx.user!, q, ctx.body)
    : S.partnerDecline(ctx.store, ctx.user!, q, ctx.body)
})

route("GET", "/api/partner/orders", "partner", (ctx) => {
  const pid = ctx.user!.partnerId
  const orders = ctx.store
    .find<Order>("orders", (o) => o.partnerId === pid)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((o) => ({ ...o, summary: S.orderSummary(o) }))
  return { orders }
})

route("GET", "/api/partner/orders/([\\w-]+)", "partner", (ctx, id) => {
  const o = orderView(ctx.store, ownOrder(ctx, id))
  const offers = Object.fromEntries(
    ctx.store
      .find<Offer>("offers", (x) => x.partnerId === ctx.user!.partnerId)
      .map((x) => [x.id, x])
  )
  o.offerRates = Object.fromEntries(
    o.items
      .filter((it) => it.offerId in offers)
      .map((it) => [it.offerId, offers[it.offerId].prices])
  )
  return o
})

route("POST", "/api/partner/orders/([\\w-]+)/changes", "partner", (ctx, id) =>
  orderView(ctx.store, S.partnerProposeChange(ctx.store, ctx.user!, ownOrder(ctx, id), ctx.body))
)

route(
  "POST",
  "/api/partner/orders/([\\w-]+)/changes/([\\w-]+)/decline",
  "partner",
  (ctx, id, cid) => {
    const o = ownOrder(ctx, id)
    return orderView(
      ctx.store,
      S.partnerDeclineChange(ctx.store, ctx.user!, o, findChange(o, cid), ctx.body)
    )
  }
)

route("POST", "/api/partner/orders/([\\w-]+)/charges", "partner", (ctx, id) => {
  const o = ownOrder(ctx, id)
  const ids = ((ctx.body.files ?? []) as unknown[])
    .slice(0, 6)
    .map((up) =>
      saveUpload(ctx.store, up, {
        orderId: o.id,
        clientId: o.clientId,
        partnerId: o.partnerId,
        public: false,
      })
    )
    .filter((m): m is FileMeta => m !== null)
    .map((m) => m.id)
  return orderView(ctx.store, S.partnerAddCharge(ctx.store, ctx.user!, o, ctx.body, ids))
})

route("POST", "/api/partner/orders/([\\w-]+)/charges/([\\w-]+)", "partner", (ctx, id, cid) => {
  const o = ownOrder(ctx, id)
  return orderView(
    ctx.store,
    S.partnerUpdateCharge(ctx.store, ctx.user!, o, findCharge(o, cid), ctx.body)
  )
})

route("POST", "/api/partner/orders/([\\w-]+)/status", "partner", (ctx, id) =>
  orderView(ctx.store, S.partnerSetStatus(ctx.store, ctx.user!, ownOrder(ctx, id), ctx.body.status))
)

route("POST", "/api/partner/orders/([\\w-]+)/invoices", "partner", (ctx, id) => {
  const o = ownOrder(ctx, id)
  const meta = saveUpload(
    ctx.store,
    ctx.body.file,
    { orderId: o.id, clientId: o.clientId, partnerId: o.partnerId, public: false },
    ["application/pdf", "application/xml", "text/xml"]
  )
  return orderView(
    ctx.store,
    S.partnerUploadInvoice(ctx.store, ctx.user!, o, ctx.body, meta?.id ?? null, meta?.name ?? null)
  )
})

route("POST", "/api/partner/orders/([\\w-]+)/payment", "partner", (ctx, id) =>
  orderView(ctx.store, S.partnerConfirmPayment(ctx.store, ctx.user!, ownOrder(ctx, id), ctx.body))
)

route("GET", "/api/partner/documents", "partner", (ctx) => {
  const pid = ctx.user!.partnerId
  const documents = ctx.store
    .find<Order>("orders", (o) => o.partnerId === pid)
    .map((o) => ({
      orderId: o.id,
      code: o.code,
      clientName: o.clientName,
      period: o.period,
      status: o.status,
      summary: S.orderSummary(o),
      invoices: o.invoices,
      notices: o.notices,
      payment: o.payment,
    }))
    .sort((a, b) => b.code.localeCompare(a.code))
  return { documents }
})

route("GET", "/api/partner/commissions", "partner", (ctx) =>
  S.commissionReport(ctx.store, partnerOf(ctx))
)
