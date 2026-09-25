import type {
  Accessory,
  AssistantQuestion,
  AssistantResult,
  AssistantState,
  AssistantSuggestion,
  Model,
  Offer,
  Partner,
} from "@/lib/machina/types"

import { addDays, isoDate, parseDate, today } from "./dates"
import { SPEC_SCHEMA, TOWNS } from "./meta"
import type { Store } from "./store"

// "Describe your job" assistant, demo engine: guided, rule-based simulation.
// Suggested machines always come from the catalogue (existing ids), and
// prices/offers are read from the store, never generated.

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
}
const WEEKDAYS: Record<string, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
}

const JOBS: Record<string, string[]> = {
  dig: [
    "dig",
    "excavat",
    "foundation",
    "trench",
    "sewer",
    "pipe",
    "footing",
    "pool",
    "drain",
    "utility connection",
  ],
  demolition: [
    "demoli",
    "breaker",
    "break up",
    "breaking up",
    "jackhammer",
    "remove the paving",
    "remove paving",
    "crush",
  ],
  compaction: ["compact", "roller", "asphalt", "tarmac", "sub-base", "subbase", "hardcore"],
  material: [
    "earthmoving",
    "earth moving",
    "load trucks",
    "loading",
    "aggregate",
    "gravel",
    "clear the",
    "levelling",
    "leveling",
    "move soil",
    "stockpile",
  ],
  haulage: ["dumper", "rubble", "debris", "spoil", "haul", "carry soil", "take away"],
  height: [
    "at height",
    "facade",
    "façade",
    "gutter",
    "roof",
    "ceiling",
    "warehouse",
    "sign",
    "lighting",
    "lamp",
    "pruning",
    "cladding",
    "high up",
  ],
  lifting: [
    "pallet",
    "lift material",
    "lifting material",
    "upper floor",
    "bricks",
    "blocks",
    "panels",
    "telehandler",
  ],
  crane: ["crane", "precast", "beam", "truss", "tank", "container", "heavy lift"],
  power: ["generator", "power supply", "electricity", "kva", "genset", "site power"],
}
const JOB_LABELS: Record<string, string> = {
  dig: "digging",
  demolition: "demolition",
  compaction: "compaction",
  material: "moving material",
  haulage: "moving soil/rubble on site",
  height: "work at height",
  lifting: "lifting materials",
  crane: "crane lifting",
  power: "power supply",
}

const CAT_NAMES: Record<string, string> = {
  excavators: "Excavator",
  loaders: "Loader / skid steer",
  backhoes: "Backhoe loader",
  dumpers: "Dumper",
  telehandlers: "Telehandler",
  platforms: "Aerial work platform",
  rollers: "Compaction roller",
  cranes: "Mobile crane",
  generators: "Generator",
}

const GENERIC_VERIFY = [
  "Availability in the period: to be confirmed by the partner",
  "Technical suitability and safety of the machine for the job: to be confirmed with the competent professional (e.g. site manager, safety coordinator)",
]

const num = (s: string) => Number(s.replace(",", "."))
const fmtNum = (n: number) => String(n)
/** Monday = 0 … Sunday = 6, like Python's weekday(). */
const weekday = (iso: string) => (parseDate(iso).getDay() + 6) % 7
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

function makeDate(y: number, m: number, d: number): string | null {
  const dt = new Date(y, m - 1, d, 12)
  return dt.getMonth() === m - 1 && dt.getDate() === d ? isoDate(dt) : null
}

/** Recognises dates like 12/10, 12/10/2026, 12 October, October 12 (day/month order). */
function findDates(text: string, ref: string): string[] {
  const refYear = Number(ref.slice(0, 4))
  const out: [number, string][] = []
  const push = (idx: number, y: number | null, m: number, d: number) => {
    let dt = makeDate(y ?? refYear, m, d)
    if (dt && y === null && dt < ref) dt = makeDate(refYear + 1, m, d)
    if (dt) out.push([idx, dt])
  }
  // Slash only: "1.5 m" is a measurement in English, not the 1st of May.
  for (const m of text.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g)) {
    const yy = m[3]
    const y = yy ? Number(yy) + (yy.length === 2 ? 2000 : 0) : null
    push(m.index!, y, Number(m[2]), Number(m[1]))
  }
  const monthRe = Object.keys(MONTHS).join("|")
  for (const m of text.matchAll(
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthRe})\\b(?:\\s+(\\d{4}))?`, "g")
  )) {
    push(m.index!, m[3] ? Number(m[3]) : null, MONTHS[m[2]], Number(m[1]))
  }
  for (const m of text.matchAll(
    new RegExp(`\\b(${monthRe})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s+(\\d{4}))?`, "g")
  )) {
    push(m.index!, m[3] ? Number(m[3]) : null, MONTHS[m[1]], Number(m[2]))
  }
  return out.sort((a, b) => a[0] - b[0]).map(([, dt]) => dt)
}

function durationDays(text: string): number | null {
  const words: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4 }
  const m = text.match(/\b(\d+|an?|one|two|three|four)\s+(days?|weeks?|months?)\b/)
  if (!m) return null
  const n = words[m[1]] ?? Number(m[1])
  return m[2].startsWith("day") ? n : m[2].startsWith("week") ? n * 7 : n * 30
}

export function emptyState(): AssistantState {
  return { jobs: [], text: "", pending: [], unknown: [], turns: 0 }
}

/** Update the state with what the message says. */
export function parse(text: string, s: AssistantState, ref = today()): AssistantState {
  const t = ` ${text.toLowerCase().replace(/[’`]/g, "'")} `

  for (const [town, prov] of Object.entries(TOWNS).sort((a, b) => b[0].length - a[0].length)) {
    if (new RegExp(`(^|[^\\p{L}])${escapeRe(town)}([^\\p{L}]|$)`, "u").test(t)) {
      s.location = town === "torino" ? "Turin" : town.replace(/\b\p{L}/gu, (c) => c.toUpperCase())
      s.province = prov
      break
    }
  }

  const dates = findDates(t, ref)
  let start: string | null = null
  if (dates.length) {
    start = dates[0]
    if (dates.length > 1 && dates[1] >= dates[0]) s.to = dates[1]
  } else if (/\btomorrow\b/.test(t)) {
    start = addDays(ref, 1)
  } else if (/\bnext week\b/.test(t)) {
    start = addDays(ref, 7 - weekday(ref))
  } else {
    for (const [w, idx] of Object.entries(WEEKDAYS)) {
      if (new RegExp(`\\b${w}\\b`).test(t)) {
        start = addDays(ref, (idx - weekday(ref) + 7) % 7 || 7)
        break
      }
    }
  }
  if (start) s.from = start
  const dur = durationDays(t)
  if (dur && s.from) s.to = addDays(s.from, dur - 1)
  else if (dur) s.days = dur
  if (s.days && s.from && !s.to) s.to = addDays(s.from, s.days - 1)

  for (const [job, keys] of Object.entries(JOBS)) {
    if (keys.some((k) => t.includes(k)) && !s.jobs.includes(job)) {
      if (job === "crane" && /\btower crane\b/.test(t)) continue
      s.jobs.push(job)
    }
  }

  const unit = "(cm|m|metres?|meters?)"
  let m =
    t.match(
      new RegExp(
        `(passage\\w*|access|gate|door|entrance|opening|gap|width)[^0-9]{0,25}(\\d+(?:[.,]\\d+)?)\\s*${unit}\\b`
      )
    ) ?? t.match(new RegExp(`()(\\d+(?:[.,]\\d+)?)\\s*${unit}\\s+wide\\b`))
  if (m) s.accessWidthM = m[3] === "cm" ? num(m[2]) / 100 : num(m[2])
  if (/(no limit|free access|plenty of space|no restrictions?|no constraints?)/.test(t))
    s.accessWidthM = 99

  m =
    t.match(
      new RegExp(`(deep|depth|dig|digging|excavate)[^0-9]{0,20}(\\d+(?:[.,]\\d+)?)\\s*${unit}\\b`)
    ) ?? t.match(new RegExp(`()(\\d+(?:[.,]\\d+)?)\\s*${unit}\\s+deep\\b`))
  if (m) s.depthM = m[3] === "cm" ? num(m[2]) / 100 : num(m[2])

  if (s.jobs.some((j) => j === "height" || j === "lifting" || j === "crane")) {
    m =
      t.match(
        /(height|high|at|to|up to)\s[^0-9]{0,15}(\d+(?:[.,]\d+)?)\s*(m|metres?|meters?)\b(?! ?(deep|wide))/
      ) ?? t.match(/()(\d+(?:[.,]\d+)?)\s*(m|metres?|meters?)\s+(high|tall|up)\b/)
    if (m && !new RegExp(`(deep|depth|dig)[^.]{0,20}${escapeRe(m[2])}`).test(t))
      s.heightM = num(m[2])
    m = t.match(/(\d+(?:[.,]\d+)?)\s*(t|tons?|tonnes?|kg)\b/)
    if (m && (s.jobs.includes("lifting") || s.jobs.includes("crane"))) {
      s.loadKg = m[2] === "kg" ? num(m[1]) : num(m[1]) * 1000
    }
  }
  m = t.match(/(\d+(?:[.,]\d+)?)\s*kva/)
  if (m) s.powerKva = num(m[1])
  m = t.match(/(\d+(?:[.,]\d+)?)\s*(m2|m²|sqm|sq m|square met(?:re|er)s?)/)
  if (m) s.areaM2 = num(m[1])

  if (/(slop|incline|steep|hill)/.test(t)) s.ground = "sloping"
  else if (/(rough|mud|unpaved|dirt|soft ground|uneven)/.test(t)) s.ground = "rough / unpaved"
  else if (/(flat|level ground|paved|floor|yard|asphalt|concrete)/.test(t)) s.ground = "flat"

  if (/(indoor|inside|interior|warehouse)/.test(t)) s.indoor = true
  if (/(outdoor|outside|exterior|facade|façade)/.test(t))
    s.indoor = t.includes("inside") ? s.indoor : false

  if (
    /(no transport|without transport|we('ll)? collect|i('ll)? collect|collect (it )?(from|at) the depot|pick (it )?up (at|from) (the )?depot)/.test(
      t
    )
  ) {
    s.transport = false
  } else if (/(transport|deliver|delivery|bring it to (the )?site)/.test(t)) {
    s.transport = true
  }
  if (
    /(without (an )?operator|dry hire|own operator|in-house operator|we drive|no operator)/.test(t)
  )
    s.operator = false
  else if (/(with (an )?operator|wet hire|need (an )?operator|with (a )?driver)/.test(t))
    s.operator = true

  if (/\b(don't know|not sure|no idea|to be checked|dunno)\b/.test(t)) {
    for (const k of s.pending) if (!s.unknown.includes(k)) s.unknown.push(k)
  }
  return s
}

type Need = { category: string; why: string; accessoryGroup: string | null; optional: boolean }

/** From jobs to machine categories, with a reason. */
export function needsFor(s: AssistantState): Need[] {
  const needs: Need[] = []
  const add = (
    category: string,
    why: string,
    accessoryGroup: string | null = null,
    optional = false
  ) => {
    const existing = needs.find((n) => n.category === category)
    if (!existing) needs.push({ category, why, accessoryGroup, optional })
    else if (accessoryGroup && !existing.accessoryGroup) existing.accessoryGroup = accessoryGroup
  }
  const j = s.jobs
  if (j.includes("demolition")) {
    add("excavators", "To demolish with a hydraulic breaker fitted to the arm", "Demolition")
    add("dumpers", "To carry the rubble to the skip or loading point", null, true)
  }
  if (j.includes("dig")) {
    add("excavators", "To carry out the digging")
    add("dumpers", "To move the excavated soil around the site", null, true)
  }
  if (j.includes("haulage")) add("dumpers", "To carry soil and rubble within the site")
  if (j.includes("compaction")) add("rollers", "To compact the sub-base or asphalt")
  if (j.includes("material")) add("loaders", "To load and move loose material")
  if (j.includes("height")) add("platforms", "To work at height from a basket")
  if (j.includes("lifting")) add("telehandlers", "To lift and place pallets and materials")
  if (j.includes("crane")) add("cranes", "To lift heavy or bulky loads")
  if (j.includes("power")) add("generators", "To power the site")
  return needs
}

function questionsFor(s: AssistantState, needs: Need[]): AssistantQuestion[] {
  const qs: AssistantQuestion[] = []
  const unknown = new Set(s.unknown)
  const ask = (key: string, text: string, options: string[]) => {
    if (!unknown.has(key)) qs.push({ key, text, options })
  }
  const cats = needs.map((n) => n.category)
  const has = (...c: string[]) => c.some((x) => cats.includes(x))
  if (!s.province) ask("location", "Where is the site?", ["Turin", "Moncalieri", "Cuneo", "Asti"])
  if (!s.from || !s.to) {
    ask("dates", "When do you need the machines, and for how long?", [
      "From Monday for 5 days",
      "From next week for 2 weeks",
      "From Monday for a month",
    ])
  }
  if (!s.jobs.length) {
    ask("jobs", "What kind of work do you need to do?", [
      "Digging",
      "Demolition",
      "Compaction",
      "Work at height",
      "Lifting pallets",
      "Site power",
    ])
  }
  if (has("excavators") && s.jobs.includes("dig") && !s.depthM) {
    ask("depth", "How deep do you need to dig?", ["Depth 1.5 m", "Depth 3 m", "Depth 5 m"])
  }
  if (has("excavators", "dumpers", "loaders", "rollers", "platforms") && !s.accessWidthM) {
    ask("access", "What's the narrowest passage into the site?", [
      "Passage 1 m",
      "Passage 1.5 m",
      "Passage 2.5 m",
      "No limit",
    ])
  }
  if (has("platforms") && !s.heightM) {
    ask("height", "What working height do you need (the operator's platform level)?", [
      "Height 8 m",
      "Height 12 m",
      "Height 15 m",
      "Height 20 m",
    ])
  }
  if (has("platforms") && (s.indoor === undefined || s.indoor === null)) {
    ask("indoor", "Is the work indoors on a flat floor, or outdoors?", [
      "Indoors, flat floor",
      "Outdoors, rough ground",
    ])
  }
  if (has("telehandlers") && (!s.heightM || !s.loadKg)) {
    ask("lift", "What load do you need to lift, and to what height?", [
      "2 t to 10 m",
      "3 t to 14 m",
      "4 t to 20 m",
    ])
  }
  if (has("cranes") && !s.loadKg)
    ask("crane", "What is the heaviest load, and how far is it from the crane?", [
      "5 t at 10 m",
      "10 t at 12 m",
      "Not sure",
    ])
  if (has("generators") && !s.powerKva)
    ask("power", "How much electrical power do you need?", [
      "100 kVA",
      "200 kVA",
      "250 kVA",
      "Not sure",
    ])
  if (has("rollers") && !s.areaM2)
    ask("area", "How large is the area to compact?", ["200 sqm", "1000 sqm", "5000 sqm"])
  if (has("excavators", "dumpers", "loaders", "rollers", "telehandlers") && !s.ground) {
    ask("ground", "What's the ground like?", ["Flat ground", "Sloping", "Rough / muddy"])
  }
  if (s.transport === undefined)
    ask("transport", "Do you need delivery to the site?", [
      "Yes, delivery and pickup",
      "No, I'll collect from the depot",
    ])
  if (s.operator === undefined && needs.length) {
    ask("operator", "Do you want an operator with the machine?", [
      "Yes, with operator",
      "No, dry hire (without operator)",
    ])
  }
  return qs
}

const spec = (m: Model, key: string) => {
  const v = m.specs[key]
  return typeof v === "number" ? v : 0
}

function pickModels(
  s: AssistantState,
  need: Need,
  models: Model[]
): { picked: Model[]; failed: string[] } {
  const cat = need.category
  let cands = models.filter((m) => m.category === cat)
  const failed: string[] = []
  const w = s.accessWidthM
  if (w && w < 99) {
    const ok = cands.filter((m) => spec(m, "width_mm") / 1000 <= w - 0.1)
    if (!ok.length) failed.push(`a ${fmtNum(w)} m passage`)
    cands = ok
  }
  if (cat === "excavators" && s.depthM) {
    const ok = cands.filter((m) => spec(m, "dig_depth_m") >= s.depthM!)
    if (!ok.length) failed.push(`a digging depth of ${fmtNum(s.depthM)} m`)
    cands = ok
  }
  if (cat === "platforms") {
    if (s.heightM) {
      const ok = cands.filter((m) => spec(m, "height_m") >= s.heightM!)
      if (!ok.length) failed.push(`a working height of ${fmtNum(s.heightM)} m`)
      cands = ok
    }
    if (s.indoor === true) {
      const electric = cands.filter((m) => m.specs.power_source === "Electric")
      cands = electric.length ? electric : cands
    }
    if (s.indoor === false || s.ground === "rough / unpaved" || s.ground === "sloping") {
      const rough = cands.filter((m) => m.subtype !== "Scissor lift")
      cands = rough.length ? rough : cands
    }
  }
  if (cat === "telehandlers") {
    if (s.heightM) {
      const ok = cands.filter((m) => spec(m, "height_m") >= s.heightM!)
      if (!ok.length) failed.push(`a height of ${fmtNum(s.heightM)} m`)
      cands = ok
    }
    if (s.loadKg) cands = cands.filter((m) => spec(m, "load_kg") >= s.loadKg!)
  }
  if (cat === "cranes" && s.loadKg)
    cands = cands.filter((m) => spec(m, "capacity_t") * 1000 >= s.loadKg!)
  if (cat === "generators" && s.powerKva) {
    const ok = cands.filter((m) => spec(m, "power_kva") >= s.powerKva!)
    if (!ok.length) failed.push(`a power of ${fmtNum(s.powerKva)} kVA`)
    cands = ok
  }
  if (cat === "rollers" && s.areaM2) {
    const pref =
      s.areaM2 > 1500 && !s.text.includes("asphalt") ? "Single drum roller" : "Tandem roller"
    cands = [...cands].sort((a, b) => (a.subtype === pref ? 0 : 1) - (b.subtype === pref ? 0 : 1))
    return { picked: cands.slice(0, 1), failed }
  }
  if (cat === "excavators" && s.areaM2 && s.areaM2 > 2000) {
    cands = [...cands].sort((a, b) => spec(b, "weight_kg") - spec(a, "weight_kg"))
    return { picked: cands.slice(0, 1), failed }
  }
  const key =
    (
      {
        platforms: "height_m",
        telehandlers: "height_m",
        generators: "power_kva",
        cranes: "capacity_t",
      } as Record<string, string>
    )[cat] ?? "weight_kg"
  cands = [...cands].sort((a, b) => spec(a, key) - spec(b, key))
  return { picked: cands.slice(0, 1), failed }
}

function reasonsFor(m: Model, s: AssistantState, need: Need): string[] {
  const schema = Object.fromEntries((SPEC_SCHEMA[m.category] ?? []).map((f) => [f.key, f]))
  const r = [`${need.why}.`]
  for (const key of ["width_mm", "dig_depth_m", "height_m", "load_kg", "power_kva", "capacity_t"]) {
    if (key in m.specs && schema[key]) {
      r.push(`${schema[key].label}: ${m.specs[key]} ${schema[key].unit}.`.replace("  ", " "))
    }
  }
  if (s.accessWidthM && s.accessWidthM < 99 && "width_mm" in m.specs) {
    r.push(`Fits through the ${fmtNum(s.accessWidthM)} m passage you mentioned.`)
  }
  return r.slice(0, 4)
}

function verifyFor(m: Model, s: AssistantState): string[] {
  const v: string[] = []
  const cat = m.category
  if (
    !s.accessWidthM &&
    ["excavators", "dumpers", "loaders", "rollers", "platforms", "telehandlers"].includes(cat)
  ) {
    v.push("Width of the passages and the site entrance")
  }
  if (!s.ground && cat !== "generators")
    v.push("Ground: slope, load-bearing capacity and manoeuvring space")
  if (cat === "excavators") {
    v.push("Underground utilities (gas, water, electricity) in the digging area")
    if (!s.depthM) v.push("Actual digging depth")
  }
  if (cat === "platforms")
    v.push("Overhead power lines and obstacles; the operator's MEWP training")
  if (cat === "telehandlers") v.push("Load chart at the required height and reach")
  if (cat === "cranes") v.push("Lift plan: working radius, parking area, use of public land")
  if (cat === "generators")
    v.push("Load consumption and inrush currents; connection by a qualified electrician")
  if (cat === "rollers") v.push("Vibration near buildings and utilities")
  if (cat === "dumpers") v.push("Ramps and slopes to be driven fully loaded")
  return [...v, ...GENERIC_VERIFY]
}

function attachOffers(
  store: Store,
  sug: Omit<AssistantSuggestion, "offers">,
  s: AssistantState
): AssistantSuggestion {
  const partners = Object.fromEntries(store.all<Partner>("partners").map((p) => [p.id, p]))
  const offers = store
    .find<Offer>("offers", (o) => o.modelId === sug.modelId && o.active !== false)
    .map((o) => {
      const p = partners[o.partnerId]
      return {
        offerId: o.id,
        partnerId: p.id,
        partnerName: p.name,
        partnerCity: p.city,
        day: o.prices.day,
        inZone: s.province ? o.zones.includes(s.province) : null,
        operatorMode: o.operator.mode,
        transportMode: o.transport.mode,
        accessoryIds: o.accessories.map((a) => a.accessoryId),
      }
    })
    .sort(
      (a, b) =>
        Number(a.inZone === false) - Number(b.inZone === false) || (a.day ?? 1e9) - (b.day ?? 1e9)
    )
  return { ...sug, offers }
}

function compatibleAccessories(store: Store, modelId: string, group: string | null): string[] {
  if (!group) return []
  return store
    .find<Accessory>(
      "accessories",
      (a) => a.compatibleModelIds.includes(modelId) && a.group === group
    )
    .map((a) => a.id)
}

const fmtDate = (iso: string) => iso.split("-").reverse().join("/")

function summaryOf(s: AssistantState): { label: string; value: string }[] {
  const out: [string, string][] = []
  if (s.location) out.push(["Location", `${s.location} (${s.province})`])
  if (s.from && s.to) out.push(["Period", `${fmtDate(s.from)} → ${fmtDate(s.to)}`])
  else if (s.from) out.push(["Start", fmtDate(s.from)])
  if (s.jobs.length) out.push(["Work", s.jobs.map((j) => JOB_LABELS[j]).join(", ")])
  const facts: [keyof AssistantState, string, (v: number) => string][] = [
    ["depthM", "Depth", (v) => `${fmtNum(v)} m`],
    ["accessWidthM", "Narrowest passage", (v) => (v >= 99 ? "no limit" : `${fmtNum(v)} m`)],
    ["heightM", "Working height", (v) => `${fmtNum(v)} m`],
    ["loadKg", "Load", (v) => `${fmtNum(v)} kg`],
    ["powerKva", "Power", (v) => `${fmtNum(v)} kVA`],
    ["areaM2", "Area", (v) => `${fmtNum(v)} m²`],
  ]
  for (const [key, label, fmt] of facts) {
    const v = s[key]
    if (typeof v === "number" && v) out.push([label, fmt(v)])
  }
  if (s.ground) out.push(["Ground", s.ground])
  if (s.indoor !== undefined && s.indoor !== null)
    out.push(["Setting", s.indoor ? "indoors" : "outdoors"])
  if (s.transport !== undefined)
    out.push(["Transport", s.transport ? "yes" : "no, collect from the depot"])
  if (s.operator !== undefined) out.push(["Operator", s.operator ? "yes" : "no (dry hire)"])
  return out.map(([label, value]) => ({ label, value }))
}

export function runAssistant(
  store: Store,
  message: string,
  state: Partial<AssistantState> | null
): AssistantResult {
  const s: AssistantState = { ...emptyState(), ...(state ?? {}) }
  s.jobs = [...(s.jobs ?? [])]
  s.unknown = [...(s.unknown ?? [])]
  s.text = `${s.text ?? ""} ${message}`.trim().slice(-4000)
  s.turns = (s.turns ?? 0) + 1
  parse(message, s)
  const needs = needsFor(s)
  const qs = questionsFor(s, needs)
  const askNow = qs.slice(0, 2)
  s.pending = askNow.map((q) => q.key)
  const models = store.all<Model>("models")
  const suggestions: AssistantSuggestion[] = []
  const unmet: string[] = []
  const ready = Boolean(needs.length && s.province && s.from && s.to)
  if (ready) {
    for (const need of needs) {
      const { picked, failed } = pickModels(s, need, models)
      if (failed.length)
        unmet.push(
          `${CAT_NAMES[need.category]}: no machine in the catalogue meets ${failed.join(" and ")}.`
        )
      for (const m of picked) {
        suggestions.push(
          attachOffers(
            store,
            {
              modelId: m.id,
              category: m.category,
              label: `${m.brand} ${m.model}`,
              subtype: m.subtype,
              image: m.image,
              optional: need.optional,
              reasons: reasonsFor(m, s, need),
              toVerify: verifyFor(m, s),
              accessoryIds: compatibleAccessories(store, m.id, need.accessoryGroup),
            },
            s
          )
        )
      }
    }
  }
  return {
    mode: "demo",
    reply: reply(s, needs, askNow, suggestions, unmet, ready),
    questions: askNow,
    state: s,
    summary: summaryOf(s),
    suggestions,
    unmet,
    remaining: qs.slice(2).map((q) => q.text),
  }
}

function reply(
  s: AssistantState,
  needs: Need[],
  askNow: AssistantQuestion[],
  suggestions: AssistantSuggestion[],
  unmet: string[],
  ready: boolean
) {
  const parts: string[] = []
  if (s.turns === 1 && !needs.length && !s.province) {
    parts.push(
      "Hi, I'm the Machina assistant (demo mode). Describe the job: what you need to do, where and when."
    )
  } else if (needs.length) {
    const cats = needs
      .map((n) => CAT_NAMES[n.category].toLowerCase() + (n.optional ? " (optional)" : ""))
      .join(", ")
    parts.push(`For this job you will probably need: ${cats}.`)
  }
  if (ready && suggestions.length) {
    parts.push(
      "I've picked the machines from the catalogue that look suitable. Prices and conditions are the ones published by the partners; availability and suitability still need to be confirmed."
    )
  }
  if (unmet.length)
    parts.push(
      `${unmet.join(" ")} You can still send a request: partners can suggest alternatives.`
    )
  if (askNow.length) parts.push(`To refine the suggestion: ${askNow.map((q) => q.text).join(" ")}`)
  else if (ready)
    parts.push(
      "I have the main information. Select the machines and prepare the request to the partners."
    )
  return parts.join(" ") || "Tell me a bit more about the job."
}
