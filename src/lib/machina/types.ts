// Domain types shared by the mock API (src/server/mock) and the UI.
// Money values are euros (VAT excluded unless the field says gross).

export type Role = "client" | "partner"

export type TransportMode = "fixed" | "on_quote" | "unavailable"
export type OperatorMode = "available" | "on_quote" | "unavailable" | "included"
export type LineType = "equipment" | "accessory" | "operator" | "transport" | "service"
export type QuoteStatus =
  | "awaiting_partner"
  | "sent"
  | "accepted"
  | "declined_by_partner"
  | "rejected_by_client"
  | "expired"
  | "withdrawn"
export type OrderStatus = "confirmed" | "in_progress" | "completed" | "cancelled"
export type PaymentStatus = "unpaid" | "declared" | "received"
export type ChangeKind = "extension" | "accessory" | "service"
export type ChangeStatus =
  "requested_by_client" | "pending_approval" | "accepted" | "rejected" | "declined_by_partner"
export type ChargeKind = "damage" | "fuel" | "cleaning" | "other"
export type ChargeStatus = "pending_review" | "accepted" | "disputed" | "withdrawn"
export type RequestStatus = "confirmed" | "partial" | "partially_closed" | "in_progress" | "closed"
export type DocType = "invoice" | "supplementary_invoice" | "credit_note"
export type RequestSource = "assistant" | "direct"

export type Period = { from: string; to: string }
export type Prices = { day: number | null; week: number | null; month: number | null }

// ------------------------------------------------------------------ catalog
export type Category = { id: string; name: string; subtypes: string[]; image: string }
export type SpecField = { key: string; label: string; unit: string; type: "num" | "text" }
export type SpecFilter = { key: string; label: string; op: "min" | "max" }
export type Province = { id: string; name: string }
export type SpecValue = number | string

export type Model = {
  id: string
  category: string
  subtype: string
  brand: string
  model: string
  description: string
  specs: Record<string, SpecValue>
  jobs: string[]
  limits: string[]
  image: string
  /** "machina" for catalog models, or the partner id that created it. */
  owner: string
  demo: boolean
}
export type SpecItem = { key: string; label: string; unit: string; value: SpecValue }
export type PublicModel = Model & { specList: SpecItem[] }

export type Accessory = {
  id: string
  name: string
  group: string
  compatibleModelIds: string[]
  description: string
  demo: boolean
}

export type OfferAccessory = {
  accessoryId: string
  day: number
  week: number | null
  included?: boolean
}

export type Offer = {
  id: string
  partnerId: string
  modelId: string
  prices: Prices
  minDays: number
  hoursPerDay: number
  extraHourPrice: number | null
  transport: { mode: TransportMode; price: number | null }
  operator: { mode: OperatorMode; pricePerDay: number | null }
  deposit: number | null
  accessories: OfferAccessory[]
  conditions: string[]
  zones: string[]
  units: number
  active: boolean
  photos: string[]
  notes: string
  demo: boolean
  availability: string
}

export type PartnerPublic = {
  id: string
  name: string
  city: string
  province: string
  zones: string[]
  verified: boolean
  demo: boolean
}

export type PublicOffer = Omit<Offer, "accessories"> & {
  partner: PartnerPublic
  accessories: (OfferAccessory & { name: string })[]
}

// ------------------------------------------------------------ organisations
export type Partner = {
  id: string
  name: string
  vat: string
  address: string
  city: string
  province: string
  zones: string[]
  email: string
  pec: string
  phone: string
  planId: string
  verified: boolean
  demo: boolean
  conditions: string
  attachments: string[]
  createdAt: string
}

export type Site = {
  id: string
  name: string
  address: string
  city: string
  province: string
  notes: string
}

export type Client = {
  id: string
  name: string
  vat: string
  address: string
  city: string
  province: string
  email: string
  pec: string
  sdi: string
  phone: string
  demo: boolean
  sites: Site[]
  createdAt?: string
}

export type User = {
  id: string
  email: string
  name: string
  role: Role
  clientId: string | null
  partnerId: string | null
  password: string
  demo: boolean
}
export type PublicUser = Omit<User, "password">
export type Me = { user: PublicUser; org: { id: string; name: string } }

export type Plan = {
  id: string
  name: string
  monthly: number
  commissionRate: number
  description: string
}
export type Settings = { id: "main"; hypothesisNote: string; plans: Plan[] }

// ------------------------------------------------------------ quotes & lines
export type Line = {
  id?: string
  type: LineType
  description: string
  qty: number
  unit: string
  unitPrice: number | null
  amount: number | null
  toConfirm?: boolean
  note?: string
  itemId?: string | null
  /** Invoice draft only: where the line comes from. */
  origin?: string
}

export type Totals = {
  net: number
  vatRate: number
  vat: number
  gross: number
  complete: boolean
  missing: number
}

export type HistoryEntry = { at: string; actor: string; text: string }

export type ItemInput = {
  id?: string
  offerId: string
  qty?: number
  accessoryIds?: string[]
  transport?: boolean
  operator?: boolean
}

export type RequestItem = {
  id: string
  offerId: string
  modelId: string
  partnerId: string
  label: string
  category: string
  qty: number
  accessoryIds: string[]
  transport: boolean
  operator: boolean
}

export type SiteRef = {
  siteId: string | null
  name: string
  address: string
  city: string
  province: string
}

export type Needs = { accessWidth: string; ground: string; schedule: string; notes: string }

export type QuoteVersion = {
  n: number
  kind: "draft" | "quote"
  author: string
  authorType: "machina" | "partner"
  createdAt: string
  lines: Line[]
  totals: Totals
  info: string[]
  warnings: string[]
  validUntil: string | null
  note: string
}

export type Acceptance = { version: number; by: string; at: string }

export type Quote = {
  id: string
  code: string
  requestId: string
  requestCode: string
  clientId: string
  clientName: string
  partnerId: string
  partnerName: string
  status: QuoteStatus
  createdAt: string
  period: Period
  site: SiteRef
  needs: Needs
  jobDescription: string
  items: RequestItem[]
  versions: QuoteVersion[]
  currentVersion: number
  acceptedVersion: number | null
  acceptance?: Acceptance
  orderId?: string
  declineReason?: string
  rejectReason?: string
  history: HistoryEntry[]
}

export type RentalRequest = {
  id: string
  code: string
  clientId: string
  clientName: string
  createdAt: string
  createdBy: string
  period: Period
  site: SiteRef
  needs: Needs
  jobDescription: string
  source: RequestSource
  items: RequestItem[]
  quoteIds: string[]
  history: HistoryEntry[]
}

export type RequestOverview = {
  status: RequestStatus
  label: string
  counts: Partial<Record<QuoteStatus, number>>
  total: number
  accepted: number
  open: number
  closed: number
}

// ------------------------------------------------------------------ orders
export type OrderChange = {
  id: string
  code: string
  origin: "client" | "partner"
  kind: ChangeKind
  reason: string
  newTo: string | null
  line: Line | null
  status: ChangeStatus
  createdAt: string
  createdBy: string
  pricedAt?: string
  pricedBy?: string
  prevNet?: number
  prevGross?: number
  newNet?: number
  newGross?: number
  decidedAt?: string
  decidedBy?: string
  rejectReason?: string
  declineReason?: string
  invoiceNotice?: boolean
}

export type FileMeta = {
  id: string
  name: string
  mime: string
  size: number
  createdAt: string
  public?: boolean
  partnerId?: string
  clientId?: string
  orderId?: string
  kind?: string
}

export type OrderCharge = {
  id: string
  code: string
  kind: ChargeKind
  description: string
  amount: number
  attachments: string[]
  status: ChargeStatus
  createdAt: string
  createdBy: string
  clientNote?: string
  decidedAt?: string
  log: HistoryEntry[]
  /** Added by the API when an order is read. */
  files?: FileMeta[]
}

export type Invoice = {
  id: string
  docType: DocType
  number: string
  date: string
  amount: number
  fileId: string
  fileName: string
  uploadedAt: string
  uploadedBy: string
  note: string
}

export type Payment = {
  status: PaymentStatus
  declared?: { amount: number; date: string; method: string; note: string; at: string; by: string }
  confirmed?: { amount: number; date: string; at: string; by: string }
}

export type Notice = { at: string; text: string; changeId?: string }

export type Order = {
  id: string
  code: string
  quoteId: string
  quoteCode: string
  requestId: string
  requestCode: string
  clientId: string
  clientName: string
  partnerId: string
  partnerName: string
  createdAt: string
  period: Period
  originalPeriod: Period
  site: SiteRef
  needs: Needs
  items: RequestItem[]
  acceptedVersion: number
  acceptance: Acceptance
  lines: Line[]
  baseTotals: Totals
  info: string[]
  status: OrderStatus
  changes: OrderChange[]
  charges: OrderCharge[]
  invoices: Invoice[]
  notices: Notice[]
  payment: Payment
  history: HistoryEntry[]
}

export type OrderSummary = {
  baseNet: number
  changesNet: number
  chargesNet: number
  agreedNet: number
  vat: number
  agreedGross: number
  vatRate: number
  pendingChangesNet: number
  pendingChargesNet: number
  contestedChargesNet: number
}

export type OrderView = Order & {
  summary: OrderSummary
  /** Supplier view only: current catalogue rates per offer, used to prefill extensions. */
  offerRates?: Record<string, Prices>
}

// ------------------------------------------------------------ API responses
export type MetaResponse = {
  categories: Category[]
  specSchema: Record<string, SpecField[]>
  specFilters: SpecFilter[]
  provinces: Province[]
  accessories: Accessory[]
  settings: Settings
  aiMode: "demo" | "ai"
  vatRate: number
}

export type CatalogOffer = {
  offerId: string
  partner: PartnerPublic
  day: number | null
  week: number | null
  month: number | null
  estimate: number | null
  operator: OperatorMode
  transport: TransportMode
}
export type CatalogResponse = {
  results: { model: PublicModel; offers: CatalogOffer[] }[]
  period: Period | null
}

export type ModelDetail = { model: PublicModel; offers: PublicOffer[]; accessories: Accessory[] }

export type AccessoryListing = Accessory & {
  compatibleModels: { id: string; label: string }[]
  availability: {
    offerId: string
    modelId: string
    model: string
    partner: string
    day: number
    week: number | null
    included: boolean
  }[]
}

export type CompareRow = {
  offer: PublicOffer
  model: PublicModel
  lines: Line[]
  totals: Totals
  info: string[]
  warnings: string[]
  included: string[]
  missing: string[]
  toConfirm: string[]
  inZone: boolean
  days: number
}
export type CompareResponse = { period: Period; results: CompareRow[] }

export type EstimateGroup = {
  partnerId: string
  partnerName: string
  partnerCity: string
  items: RequestItem[]
  lines: Line[]
  info: string[]
  warnings: string[]
  totals: Totals
}

export type DemoAccount = PublicUser & { org: string }

export type ActionItem = { kind: string; text: string; link: string }

export type ClientSummary = {
  counts: {
    quotesToEvaluate: number
    waitingPartner: number
    activeOrders: number
    changesToApprove: number
    chargesToVerify: number
    paymentsOpen: number
  }
  actions: ActionItem[]
  recentOrders: (Order & { summary: OrderSummary })[]
}

export type PartnerSummary = {
  counts: {
    newRequests: number
    awaitingClient: number
    activeOrders: number
    changesOpen: number
    chargesContested: number
    invoicesMissing: number
    offers: number
  }
  actions: ActionItem[]
}

export type RequestPart = { id: string; code: string; partnerName: string; status: QuoteStatus }
export type RequestListItem = RentalRequest & { overview: RequestOverview; parts: RequestPart[] }
export type RequestDetail = RentalRequest & { overview: RequestOverview; quotes: Quote[] }

export type ClientDocument = {
  orderId: string
  code: string
  partnerName: string
  period: Period
  status: OrderStatus
  summary: OrderSummary
  invoices: Invoice[]
  payment: Payment
}
export type PartnerDocument = Omit<ClientDocument, "partnerName"> & {
  clientName: string
  notices: Notice[]
}

export type PartnerOffer = Offer & { model: PublicModel; accessoryNames: Record<string, string> }
export type PartnerOffersResponse = { offers: PartnerOffer[]; models: PublicModel[] }
export type PartnerOfferDetail = Offer & { model: PublicModel; photosMeta: FileMeta[] }
export type PartnerProfile = Partner & { attachmentsMeta: FileMeta[] }

export type ImportRow = {
  line: number
  data: Record<string, string>
  errors: Record<string, string>
  valid: boolean
  action: string
}
export type ImportPreview = { rows: ImportRow[]; valid: number; invalid: number; columns: string[] }

export type CommissionReport = {
  plan: Plan
  plans: Plan[]
  rows: {
    orderId: string
    code: string
    client: string
    createdAt: string
    status: OrderStatus
    base: number
    rate: number
    commission: number
  }[]
  totalCommission: number
  note: string
}

export type InvoiceDraft = {
  title: string
  generatedAt: string
  orderCode: string
  quoteCode: string
  acceptedVersion: number
  issuer: Pick<
    Partner,
    "name" | "vat" | "address" | "city" | "province" | "email" | "pec" | "phone"
  >
  customer: Pick<Client, "name" | "vat" | "address" | "city" | "province" | "pec" | "sdi" | "email">
  period: Period
  originalPeriod: Period
  site: SiteRef
  lines: Line[]
  totals: { net: number; vatRate: number; vat: number; gross: number }
  excluded: { pendingChanges: number; contestedCharges: number; pendingCharges: number }
  invoicesIssued: { number: string; date: string }[]
  disclaimer: string
}

// --------------------------------------------------------------- assistant
export type AssistantQuestion = { key: string; text: string; options: string[] }
export type AssistantSuggestionOffer = {
  offerId: string
  partnerId: string
  partnerName: string
  partnerCity: string
  day: number | null
  inZone: boolean | null
  operatorMode: OperatorMode
  transportMode: TransportMode
  accessoryIds: string[]
}
export type AssistantSuggestion = {
  modelId: string
  category: string
  label: string
  subtype: string
  image: string
  optional: boolean
  reasons: string[]
  toVerify: string[]
  accessoryIds: string[]
  offers: AssistantSuggestionOffer[]
}
export type AssistantState = {
  jobs: string[]
  text: string
  pending: string[]
  unknown: string[]
  turns: number
  location?: string
  province?: string
  from?: string
  to?: string
  days?: number
  accessWidthM?: number
  depthM?: number
  heightM?: number
  loadKg?: number
  powerKva?: number
  areaM2?: number
  ground?: string
  indoor?: boolean | null
  transport?: boolean
  operator?: boolean
}
export type AssistantResult = {
  mode: "demo" | "ai"
  reply: string
  questions: AssistantQuestion[]
  state: AssistantState
  summary: { label: string; value: string }[]
  suggestions: AssistantSuggestion[]
  unmet: string[]
  remaining: string[]
  notice?: string
}

/** Error body returned by the API: a message plus per-field messages. */
export type ApiErrorBody = { error: string; fields: Record<string, string> }
