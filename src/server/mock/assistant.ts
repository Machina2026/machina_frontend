import { catalogText } from "@/i18n/catalog-text"
import { INTL_LOCALE, type Locale } from "@/i18n/config"
import type {
  Accessory,
  AssistantQuestion,
  AssistantResult,
  AssistantState,
  AssistantStep,
  AssistantSuggestion,
  Model,
  Offer,
  Partner,
} from "@/lib/machina/types"

import { addDays, isoDate, parseDate, today } from "./dates"
import { SPEC_SCHEMA, TOWNS } from "./meta"
import type { Store } from "./store"

// "Describe your job" assistant, mock agent. It answers like the planned AI
// agent (same request and AssistantResult, including the steps it took), but
// reads Italian and English with rules. Suggested machines always come from the
// catalogue (existing ids), and prices/offers are read from the store, never
// generated. To plug in the real agent, replace runAssistant behind
// POST /api/assistant and keep the result shape.

// ---- Reading the message ----------------------------------------------------

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
  gennaio: 1,
  febbraio: 2,
  marzo: 3,
  aprile: 4,
  maggio: 5,
  giugno: 6,
  luglio: 7,
  agosto: 8,
  settembre: 9,
  ottobre: 10,
  novembre: 11,
  dicembre: 12,
}
/** Monday = 0. Accents are removed before matching. */
const WEEKDAYS: Record<string, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  lunedi: 0,
  martedi: 1,
  mercoledi: 2,
  giovedi: 3,
  venerdi: 4,
  sabato: 5,
}
const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  ten: 10,
  un: 1,
  uno: 1,
  una: 1,
  due: 2,
  tre: 3,
  quattro: 4,
  cinque: 5,
  sei: 6,
  dieci: 10,
}

/**
 * Words that point to a kind of work, English and Italian, matched at the start
 * of a word ("scav" finds "scavare"). A trailing "$" asks for the whole word.
 */
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
    "scav",
    "trince",
    "fondazion",
    "fogna",
    "fognatur",
    "tubaz",
    "tubi$",
    "drenagg",
    "piscina",
    "allacciament",
    "plint",
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
    "martell",
    "rompere",
    "frantum",
    "smantell",
  ],
  compaction: [
    "compact",
    "roller",
    "asphalt",
    "tarmac",
    "sub-base",
    "subbase",
    "hardcore",
    "compatt",
    "rullo",
    "asfalt",
    "sottofondo",
    "massicciata",
  ],
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
    "movimento terra",
    "movimentazione terra",
    "caricare i camion",
    "caricare camion",
    "inerti",
    "ghiaia",
    "livell",
    "spostare la terra",
    "spostare terra",
    "cumul",
  ],
  haulage: [
    "dumper",
    "rubble",
    "debris",
    "spoil",
    "haul",
    "carry soil",
    "take away",
    "macerie",
    "detriti",
    "terra di scavo",
    "portare via",
  ],
  height: [
    "at height",
    "facade",
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
    "in quota",
    "facciat",
    "grondai",
    "tetto",
    "tetti$",
    "soffitt",
    "capannon",
    "insegn",
    "illuminazion",
    "lampion",
    "potatur",
    "rivestiment",
    "in alto",
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
    "bancal",
    "sollevare material",
    "sollevamento material",
    "sollevare i material",
    "piano superiore",
    "piani alti",
    "mattoni",
    "blocchi",
    "pannelli",
    "sollevatore telescopico",
    "telescopico",
  ],
  crane: [
    "crane",
    "precast",
    "beam",
    "truss",
    "tank",
    "container",
    "heavy lift",
    "gru$",
    "autogru",
    "prefabbricat",
    "trave",
    "travi$",
    "capriat",
    "serbatoi",
    "carichi pesanti",
  ],
  power: [
    "generator",
    "power supply",
    "electricity",
    "kva",
    "genset",
    "site power",
    "generatore",
    "gruppo elettrogeno",
    "corrente",
    "energia elettrica",
    "elettricita",
    "alimentazione del cantiere",
  ],
}

const num = (s: string) => Number(s.replace(",", "."))
/** Monday = 0 … Sunday = 6, like Python's weekday(). */
const weekday = (iso: string) => (parseDate(iso).getDay() + 6) % 7
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "")
const capitalize = (s: string) => s.replace(/(^|[\s-])\p{L}/gu, (c) => c.toUpperCase())
const stripDemo = (name: string) => name.replace(/ \((demo|mock)\)$/, "")

/** Word-start match; "word$" matches the whole word only. */
function hasWord(text: string, key: string) {
  const whole = key.endsWith("$")
  const k = escapeRe(whole ? key.slice(0, -1) : key)
  return new RegExp(`(^|[^\\p{L}])${k}${whole ? "([^\\p{L}]|$)" : ""}`, "u").test(text)
}

/** Towns by their accent-free name, keeping the accented spelling for display. */
const TOWN_INDEX = (() => {
  const index = new Map<string, { name: string; province: string }>()
  for (const [town, province] of Object.entries(TOWNS)) {
    const key = plain(town)
    const prev = index.get(key)
    if (!prev || town !== key) index.set(key, { name: town, province })
  }
  return [...index.entries()].sort((a, b) => b[0].length - a[0].length)
})()

function makeDate(y: number, m: number, d: number): string | null {
  const dt = new Date(y, m - 1, d, 12)
  return dt.getMonth() === m - 1 && dt.getDate() === d ? isoDate(dt) : null
}

type FoundDate = { index: number; date: string }

/** Dates like 12/10, 12/10/2026, 12 October, October 12, 15 novembre, dal 3 al 7 dicembre. */
function findDates(text: string, ref: string): FoundDate[] {
  const refYear = Number(ref.slice(0, 4))
  const out: FoundDate[] = []
  const push = (index: number, y: number | null, m: number, d: number) => {
    let dt = makeDate(y ?? refYear, m, d)
    if (dt && y === null && dt < ref) dt = makeDate(refYear + 1, m, d)
    if (dt) out.push({ index, date: dt })
  }
  // Slash only: "1.5 m" is a measurement, not the 1st of May.
  for (const m of text.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g)) {
    const yy = m[3]
    const y = yy ? Number(yy) + (yy.length === 2 ? 2000 : 0) : null
    push(m.index!, y, Number(m[2]), Number(m[1]))
  }
  const monthRe = Object.keys(MONTHS).join("|")
  const ord = "(?:st|nd|rd|th|°)?"
  // A range sharing one month: "3 to 7 December", "dal 3 al 7 dicembre".
  for (const m of text.matchAll(
    new RegExp(
      `\\b(\\d{1,2})${ord}\\s*(?:-|–|to|al|all'|a)\\s*(\\d{1,2})${ord}\\s+(${monthRe})\\b(?:\\s+(\\d{4}))?`,
      "g"
    )
  )) {
    const y = m[4] ? Number(m[4]) : null
    push(m.index!, y, MONTHS[m[3]], Number(m[1]))
    push(m.index! + 1, y, MONTHS[m[3]], Number(m[2]))
  }
  for (const m of text.matchAll(
    new RegExp(`\\b(\\d{1,2})${ord}\\s+(${monthRe})\\b(?:\\s+(\\d{4}))?`, "g")
  )) {
    push(m.index!, m[3] ? Number(m[3]) : null, MONTHS[m[2]], Number(m[1]))
  }
  for (const m of text.matchAll(
    new RegExp(`\\b(${monthRe})\\s+(\\d{1,2})${ord}\\b(?:,?\\s+(\\d{4}))?`, "g")
  )) {
    push(m.index!, m[3] ? Number(m[3]) : null, MONTHS[m[1]], Number(m[2]))
  }
  const seen = new Set<string>()
  return out.sort((a, b) => a.index - b.index).filter((d) => !seen.has(d.date) && seen.add(d.date))
}

/** A start date given in words: tomorrow, next week, Monday, domani, la prossima settimana… */
function relativeStart(t: string, ref: string): string | null {
  if (/\b(tomorrow|domani|asap|as soon as possible|subito|il prima possibile)\b/.test(t))
    return addDays(ref, 1)
  if (/\bdopodomani\b/.test(t)) return addDays(ref, 2)
  if (/\b(next week|prossima settimana|settimana prossima)\b/.test(t))
    return addDays(ref, 7 - weekday(ref))
  if (/\b(next month|prossimo mese|mese prossimo)\b/.test(t)) {
    const d = parseDate(ref)
    return isoDate(new Date(d.getFullYear(), d.getMonth() + 1, 1, 12))
  }
  for (const [w, idx] of Object.entries(WEEKDAYS)) {
    if (new RegExp(`\\b${w}\\b`).test(t)) return addDays(ref, (idx - weekday(ref) + 7) % 7 || 7)
  }
  return null
}

function durationDays(text: string): number | null {
  const words = Object.keys(NUMBER_WORDS).join("|")
  const m = text.match(
    new RegExp(`\\b(\\d+|${words})\\s+(days?|weeks?|months?|giorn[oi]|settiman[ae]|mes[ei])\\b`)
  )
  if (!m) return null
  const n = NUMBER_WORDS[m[1]] ?? Number(m[1])
  const unit = m[2]
  if (unit.startsWith("day") || unit.startsWith("giorn")) return n
  if (unit.startsWith("week") || unit.startsWith("settiman")) return n * 7
  return n * 30
}

export function emptyState(): AssistantState {
  return { jobs: [], text: "", pending: [], unknown: [], turns: 0 }
}

/** Update the state with what the message says, in English or Italian. */
export function parse(
  text: string,
  s: AssistantState,
  ref = today(),
  locale: Locale = "en"
): AssistantState {
  const T = TEXT[locale]
  const t = ` ${plain(text.toLowerCase().replace(/[’`]/g, "'"))} `

  for (const [town, { name, province }] of TOWN_INDEX) {
    if (hasWord(t, `${town}$`)) {
      s.location = town === "turin" || town === "torino" ? T.turin : capitalize(name)
      s.province = province
      break
    }
  }

  const dates = findDates(t, ref)
  const relative = relativeStart(t, ref)
  // "fino al 20 novembre", "until 20 November": an end date.
  const until =
    dates.length === 1 &&
    /(until|till|up to|fino al?|fino all'|entro il)\s*$/.test(t.slice(0, dates[0].index))
  if (until) {
    s.from = relative ?? s.from
    s.to = dates[0].date
  } else if (dates.length) {
    s.from = dates[0].date
    if (dates.length > 1 && dates[1].date >= dates[0].date) s.to = dates[1].date
  } else if (relative) {
    s.from = relative
  }
  const dur = durationDays(t)
  if (dur && s.from && !(dates.length > 1)) s.to = addDays(s.from, dur - 1)
  else if (dur) s.days = dur
  if (s.days && s.from && !s.to) s.to = addDays(s.from, s.days - 1)
  if (s.from && s.to && s.to < s.from) s.to = undefined

  for (const [job, keys] of Object.entries(JOBS)) {
    if (s.jobs.includes(job) || !keys.some((k) => hasWord(t, k))) continue
    if (job === "crane" && /\b(tower crane|gru a torre)\b/.test(t)) continue
    s.jobs.push(job)
  }

  const unit = "(cm|m|metres?|meters?|metri|metro)"
  const n = "(\\d+(?:[.,]\\d+)?)"
  const metres = (value: string, u: string) => (u === "cm" ? num(value) / 100 : num(value))

  let m =
    t.match(
      new RegExp(
        `(passage\\w*|access\\w*|gate|door|entrance|opening|gap|width|passagg\\w*|cancell\\w*|porta|portone|ingress\\w*|varco|apertura|larg\\w*)[^0-9]{0,25}${n}\\s*${unit}\\b`
      )
    ) ?? t.match(new RegExp(`()${n}\\s*${unit}\\s+(wide|di larghezza)\\b`))
  if (m) s.accessWidthM = metres(m[2], m[3])
  if (
    /(no limit|free access|plenty of space|no restrictions?|no constraints?|nessun limite|accesso libero|spazio ampio|nessun vincolo)/.test(
      t
    )
  )
    s.accessWidthM = 99

  m =
    t.match(
      new RegExp(
        `(deep|depth|dig|digging|excavate|profond\\w*|scav\\w*)[^0-9]{0,20}${n}\\s*${unit}\\b`
      )
    ) ?? t.match(new RegExp(`()${n}\\s*${unit}\\s+(deep|di profondita)\\b`))
  if (m) s.depthM = metres(m[2], m[3])

  if (s.jobs.some((j) => j === "height" || j === "lifting" || j === "crane")) {
    m =
      t.match(
        new RegExp(
          `\\b(height|high|at|to|up to|altezza|alto|alta|a|fino a)\\s[^0-9]{0,15}${n}\\s*(m|metres?|meters?|metri)\\b(?! ?(deep|wide|di profondita|di larghezza))`
        )
      ) ??
      t.match(new RegExp(`()${n}\\s*(m|metres?|meters?|metri)\\s+(high|tall|up|di altezza)\\b`))
    if (m && !new RegExp(`(deep|depth|dig|profond|scav)[^.]{0,20}${escapeRe(m[2])}`).test(t))
      s.heightM = num(m[2])
    m = t.match(/(\d+(?:[.,]\d+)?)\s*(t|tons?|tonnes?|tonnellat[ae]|kg)\b/)
    if (m && (s.jobs.includes("lifting") || s.jobs.includes("crane"))) {
      s.loadKg = m[2] === "kg" ? num(m[1]) : num(m[1]) * 1000
    }
  }
  m = t.match(/(\d+(?:[.,]\d+)?)\s*kva/)
  if (m) s.powerKva = num(m[1])
  m = t.match(/(\d+(?:[.,]\d+)?)\s*(m2|m²|sqm|sq m|square met(?:re|er)s?|mq|metri quadr[ia]ti?)/)
  if (m) s.areaM2 = num(m[1])

  if (/(slop|incline|steep|hill|pendenz|pendio|in salita|collin)/.test(t))
    s.ground = T.ground.sloping
  else if (
    /(rough|mud|unpaved|dirt|soft ground|uneven|fango|sterrat|terreno morbido|irregolare|accidentat)/.test(
      t
    )
  )
    s.ground = T.ground.rough
  else if (
    /(flat|level ground|paved|floor|yard|asphalt|concrete|terreno piano|pianeggiante|in piano|pavimento|cortile|cemento|piazzale|asfaltat)/.test(
      t
    )
  )
    s.ground = T.ground.flat

  if (/(indoor|inside|interior|warehouse|al chiuso|interno|dentro|capannon)/.test(t))
    s.indoor = true
  if (/(outdoor|outside|exterior|facade|all'aperto|esterno|fuori|facciat)/.test(t))
    s.indoor = /(inside|dentro)/.test(t) ? s.indoor : false

  if (
    /(no transport|without transport|we('ll)? collect|i('ll)? collect|collect (it )?(from|at) the depot|pick (it )?up (at|from) (the )?depot|senza trasporto|nessun trasporto|ritiro io|ritiriamo|lo ritiro|li ritiro|ritiro in deposito|ritiro al deposito|ritirare in deposito|vengo a ritirar|passo a ritirar)/.test(
      t
    )
  ) {
    s.transport = false
  } else if (
    /(transport|deliver|delivery|bring it to (the )?site|trasport|consegn|portare in cantiere)/.test(
      t
    )
  ) {
    s.transport = true
  }
  if (
    /(without (an )?operator|dry hire|own operator|in-house operator|we drive|no operator|senza operatore|a freddo|nostro operatore|operatore nostro|guidiamo noi|abbiamo l'operatore|ho l'operatore)/.test(
      t
    )
  )
    s.operator = false
  else if (
    /((with|and|plus|need) (an )?operator|operator included|wet hire|with (a )?driver|(con|e|anche) (l'|un )?operatore|operatore incluso|a caldo|serve (un |l')?operatore|con autista)/.test(
      t
    )
  )
    s.operator = true

  if (
    /\b(don't know|not sure|no idea|to be checked|dunno|non so|non lo so|non sono sicur[oa]|da verificare|boh)\b/.test(
      t
    )
  ) {
    for (const k of s.pending) if (!s.unknown.includes(k)) s.unknown.push(k)
  }
  return s
}

// ---- What the job needs -----------------------------------------------------

type Need = { category: string; why: string; accessoryGroup: string | null; optional: boolean }

/** From jobs to machine categories, with a reason. */
export function needsFor(s: AssistantState, locale: Locale = "en"): Need[] {
  const W = TEXT[locale].why
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
    add("excavators", W.demolish, "Demolition")
    add("dumpers", W.rubble, null, true)
  }
  if (j.includes("dig")) {
    add("excavators", W.dig)
    add("dumpers", W.spoil, null, true)
  }
  if (j.includes("haulage")) add("dumpers", W.haul)
  if (j.includes("compaction")) add("rollers", W.compact)
  if (j.includes("material")) add("loaders", W.load)
  if (j.includes("height")) add("platforms", W.height)
  if (j.includes("lifting")) add("telehandlers", W.lift)
  if (j.includes("crane")) add("cranes", W.crane)
  if (j.includes("power")) add("generators", W.power)
  return needs
}

function questionsFor(s: AssistantState, needs: Need[], locale: Locale): AssistantQuestion[] {
  const Q = TEXT[locale].q
  const qs: AssistantQuestion[] = []
  const unknown = new Set(s.unknown)
  const ask = (key: keyof typeof Q) => {
    if (!unknown.has(key)) qs.push({ key, text: Q[key][0], options: [...Q[key][1]] })
  }
  const cats = needs.map((n) => n.category)
  const has = (...c: string[]) => c.some((x) => cats.includes(x))
  if (!s.province) ask("location")
  if (!s.from || !s.to) ask("dates")
  if (!s.jobs.length) ask("jobs")
  if (has("excavators") && s.jobs.includes("dig") && !s.depthM) ask("depth")
  if (has("excavators", "dumpers", "loaders", "rollers", "platforms") && !s.accessWidthM)
    ask("access")
  if (has("platforms") && !s.heightM) ask("height")
  if (has("platforms") && (s.indoor === undefined || s.indoor === null)) ask("indoor")
  if (has("telehandlers") && (!s.heightM || !s.loadKg)) ask("lift")
  if (has("cranes") && !s.loadKg) ask("crane")
  if (has("generators") && !s.powerKva) ask("power")
  if (has("rollers") && !s.areaM2) ask("area")
  if (has("excavators", "dumpers", "loaders", "rollers", "telehandlers") && !s.ground) ask("ground")
  if (s.transport === undefined) ask("transport")
  if (s.operator === undefined && needs.length) ask("operator")
  return qs
}

// ---- Searching the catalogue -------------------------------------------------

const spec = (m: Model, key: string) => {
  const v = m.specs[key]
  return typeof v === "number" ? v : 0
}

type Failed = { kind: "passage" | "depth" | "height" | "power"; value: number }
type Pick = { picked: Model[]; failed: Failed[]; total: number; fitting: number }

function pickModels(s: AssistantState, need: Need, models: Model[]): Pick {
  const cat = need.category
  let cands = models.filter((m) => m.category === cat)
  const total = cands.length
  const failed: Failed[] = []
  const w = s.accessWidthM
  if (w && w < 99) {
    const ok = cands.filter((m) => spec(m, "width_mm") / 1000 <= w - 0.1)
    if (!ok.length) failed.push({ kind: "passage", value: w })
    cands = ok
  }
  if (cat === "excavators" && s.depthM) {
    const ok = cands.filter((m) => spec(m, "dig_depth_m") >= s.depthM!)
    if (!ok.length) failed.push({ kind: "depth", value: s.depthM })
    cands = ok
  }
  if (cat === "platforms") {
    if (s.heightM) {
      const ok = cands.filter((m) => spec(m, "height_m") >= s.heightM!)
      if (!ok.length) failed.push({ kind: "height", value: s.heightM })
      cands = ok
    }
    if (s.indoor === true) {
      const electric = cands.filter((m) => m.specs.power_source === "Electric")
      cands = electric.length ? electric : cands
    }
    if (
      s.indoor === false ||
      s.ground === TEXT.en.ground.rough ||
      s.ground === TEXT.it.ground.rough ||
      s.ground === TEXT.en.ground.sloping ||
      s.ground === TEXT.it.ground.sloping
    ) {
      const rough = cands.filter((m) => m.subtype !== "Scissor lift")
      cands = rough.length ? rough : cands
    }
  }
  if (cat === "telehandlers") {
    if (s.heightM) {
      const ok = cands.filter((m) => spec(m, "height_m") >= s.heightM!)
      if (!ok.length) failed.push({ kind: "height", value: s.heightM })
      cands = ok
    }
    if (s.loadKg) cands = cands.filter((m) => spec(m, "load_kg") >= s.loadKg!)
  }
  if (cat === "cranes" && s.loadKg)
    cands = cands.filter((m) => spec(m, "capacity_t") * 1000 >= s.loadKg!)
  if (cat === "generators" && s.powerKva) {
    const ok = cands.filter((m) => spec(m, "power_kva") >= s.powerKva!)
    if (!ok.length) failed.push({ kind: "power", value: s.powerKva })
    cands = ok
  }
  const fitting = cands.length
  if (cat === "rollers" && s.areaM2) {
    const pref =
      s.areaM2 > 1500 && !/(asphalt|asfalt)/.test(plain(s.text.toLowerCase()))
        ? "Single drum roller"
        : "Tandem roller"
    cands = [...cands].sort((a, b) => (a.subtype === pref ? 0 : 1) - (b.subtype === pref ? 0 : 1))
    return { picked: cands.slice(0, 1), failed, total, fitting }
  }
  if (cat === "excavators" && s.areaM2 && s.areaM2 > 2000) {
    cands = [...cands].sort((a, b) => spec(b, "weight_kg") - spec(a, "weight_kg"))
    return { picked: cands.slice(0, 1), failed, total, fitting }
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
  return { picked: cands.slice(0, 1), failed, total, fitting }
}

function reasonsFor(m: Model, s: AssistantState, need: Need, locale: Locale): string[] {
  const T = TEXT[locale]
  const ct = catalogText(locale)
  const fmt = numberFormat(locale)
  const schema = Object.fromEntries((SPEC_SCHEMA[m.category] ?? []).map((f) => [f.key, f]))
  const r = [`${need.why}.`]
  for (const key of ["width_mm", "dig_depth_m", "height_m", "load_kg", "power_kva", "capacity_t"]) {
    const v = m.specs[key]
    if (v !== undefined && schema[key]) {
      const value = typeof v === "number" ? fmt(v) : v
      r.push(`${ct.spec(schema[key].label)}: ${value} ${schema[key].unit}.`.replace("  ", " "))
    }
  }
  if (s.accessWidthM && s.accessWidthM < 99 && "width_mm" in m.specs) {
    r.push(T.fitsPassage(fmt(s.accessWidthM)))
  }
  return r.slice(0, 4)
}

function verifyFor(m: Model, s: AssistantState, locale: Locale): string[] {
  const V = TEXT[locale].verify
  const v: string[] = []
  const cat = m.category
  if (
    !s.accessWidthM &&
    ["excavators", "dumpers", "loaders", "rollers", "platforms", "telehandlers"].includes(cat)
  ) {
    v.push(V.passages)
  }
  if (!s.ground && cat !== "generators") v.push(V.ground)
  if (cat === "excavators") {
    v.push(V.utilities)
    if (!s.depthM) v.push(V.depth)
  }
  if (cat === "platforms") v.push(V.platforms)
  if (cat === "telehandlers") v.push(V.telehandlers)
  if (cat === "cranes") v.push(V.cranes)
  if (cat === "generators") v.push(V.generators)
  if (cat === "rollers") v.push(V.rollers)
  if (cat === "dumpers") v.push(V.dumpers)
  return [...v, V.availability, V.suitability]
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

// ---- Writing the answer -------------------------------------------------------

const fmtDate = (iso: string) => iso.split("-").reverse().join("/")
const shortDate = (iso: string) => fmtDate(iso).slice(0, 5)
const daysInclusive = (from: string, to: string) =>
  Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000) + 1

function numberFormat(locale: Locale) {
  const f = new Intl.NumberFormat(INTL_LOCALE[locale], { maximumFractionDigits: 2 })
  return (n: number) => f.format(n)
}
function euros(locale: Locale) {
  const f = new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  })
  return (n: number) => f.format(n)
}

/** Picks a phrasing by turn, so the assistant doesn't repeat itself word for word. */
const vary = <A extends unknown[]>(options: ((...a: A) => string)[], turn: number, ...a: A) =>
  options[turn % options.length](...a)

const joinList = (items: string[], and: string) =>
  items.length <= 1
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} ${and} ${items[items.length - 1]}`

type FactKey =
  | "location"
  | "from"
  | "to"
  | "jobs"
  | "depthM"
  | "accessWidthM"
  | "heightM"
  | "loadKg"
  | "powerKva"
  | "areaM2"
  | "ground"
  | "indoor"
  | "transport"
  | "operator"
/** Short phrases for what changed between two states ("1.5 m deep", "dal 16/11 al 29/11"). */
function newFacts(before: AssistantState, s: AssistantState, locale: Locale): string[] {
  const F = TEXT[locale].fact
  const fmt = numberFormat(locale)
  const changed = (k: FactKey) => JSON.stringify(before[k]) !== JSON.stringify(s[k])
  const out: string[] = []
  if (changed("location") && s.location) out.push(F.site(`${s.location} (${s.province})`))
  if ((changed("from") || changed("to")) && s.from)
    out.push(s.to ? F.period(shortDate(s.from), shortDate(s.to)) : F.start(shortDate(s.from)))
  const jobs = s.jobs.filter((j) => !before.jobs.includes(j))
  for (const j of jobs) out.push(TEXT[locale].job[j])
  if (changed("depthM") && s.depthM) out.push(F.depth(fmt(s.depthM)))
  if (changed("accessWidthM") && s.accessWidthM)
    out.push(s.accessWidthM >= 99 ? F.noLimit : F.passage(fmt(s.accessWidthM)))
  if (changed("heightM") && s.heightM) out.push(F.height(fmt(s.heightM)))
  if (changed("loadKg") && s.loadKg) out.push(F.load(fmt(s.loadKg)))
  if (changed("powerKva") && s.powerKva) out.push(F.power(fmt(s.powerKva)))
  if (changed("areaM2") && s.areaM2) out.push(F.area(fmt(s.areaM2)))
  if (changed("ground") && s.ground) out.push(F.ground(s.ground))
  if (changed("indoor") && s.indoor !== undefined && s.indoor !== null)
    out.push(s.indoor ? F.indoors : F.outdoors)
  if (changed("transport") && s.transport !== undefined)
    out.push(s.transport ? F.delivery : F.collect)
  if (changed("operator") && s.operator !== undefined) out.push(s.operator ? F.operator : F.dryHire)
  return out
}

function summaryOf(s: AssistantState, locale: Locale): { label: string; value: string }[] {
  const S = TEXT[locale].summary
  const fmt = numberFormat(locale)
  const out: [string, string][] = []
  if (s.location) out.push([S.location, `${s.location} (${s.province})`])
  if (s.from && s.to) out.push([S.period, `${fmtDate(s.from)} → ${fmtDate(s.to)}`])
  else if (s.from) out.push([S.start, fmtDate(s.from)])
  if (s.jobs.length) out.push([S.work, s.jobs.map((j) => TEXT[locale].job[j]).join(", ")])
  const facts: [keyof AssistantState, string, (v: number) => string][] = [
    ["depthM", S.depth, (v) => `${fmt(v)} m`],
    ["accessWidthM", S.passage, (v) => (v >= 99 ? S.noLimit : `${fmt(v)} m`)],
    ["heightM", S.height, (v) => `${fmt(v)} m`],
    ["loadKg", S.load, (v) => `${fmt(v)} kg`],
    ["powerKva", S.power, (v) => `${fmt(v)} kVA`],
    ["areaM2", S.area, (v) => `${fmt(v)} m²`],
  ]
  for (const [key, label, f] of facts) {
    const v = s[key]
    if (typeof v === "number" && v) out.push([label, f(v)])
  }
  if (s.ground) out.push([S.ground, s.ground])
  if (s.indoor !== undefined && s.indoor !== null)
    out.push([S.setting, s.indoor ? S.indoors : S.outdoors])
  if (s.transport !== undefined) out.push([S.transport, s.transport ? S.yes : S.collect])
  if (s.operator !== undefined) out.push([S.operator, s.operator ? S.yes : S.dryHire])
  return out.map(([label, value]) => ({ label, value }))
}

export function runAssistant(
  store: Store,
  message: string,
  state: Partial<AssistantState> | null,
  locale: Locale = "en",
  ref = today()
): AssistantResult {
  const T = TEXT[locale]
  const fmt = numberFormat(locale)
  const s: AssistantState = { ...emptyState(), ...(state ?? {}) }
  s.jobs = [...(s.jobs ?? [])]
  s.unknown = [...(s.unknown ?? [])]
  const before: AssistantState = { ...s, jobs: [...s.jobs] }
  const neededBefore = needsFor(before, locale).map((n) => n.category)
  s.text = `${s.text ?? ""} ${message}`.trim().slice(-4000)
  s.turns = (s.turns ?? 0) + 1
  parse(message, s, ref, locale)
  const facts = newFacts(before, s, locale)

  const needs = needsFor(s, locale)
  const qs = questionsFor(s, needs, locale)
  const askNow = qs.slice(0, 2)
  s.pending = askNow.map((q) => q.key)
  const models = store.all<Model>("models")
  const steps: AssistantStep[] = [
    { kind: "read", label: T.step.read, detail: facts.length ? facts.join(" · ") : T.step.nothing },
  ]

  const suggestions: AssistantSuggestion[] = []
  const unmet: string[] = []
  const ready = Boolean(needs.length && s.province && s.from && s.to)
  const searched: string[] = []
  for (const need of needs) {
    const { picked, failed, total, fitting } = pickModels(s, need, models)
    searched.push(T.step.searched(T.cats[need.category], total, fitting))
    if (!ready) continue
    if (failed.length) {
      const what = failed.map((f) => T.failed[f.kind](fmt(f.value)))
      unmet.push(T.unmet(capitalize(T.cats[need.category]), joinList(what, T.and)))
    }
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
            reasons: reasonsFor(m, s, need, locale),
            toVerify: verifyFor(m, s, locale),
            accessoryIds: compatibleAccessories(store, m.id, need.accessoryGroup),
          },
          s
        )
      )
    }
  }
  if (searched.length)
    steps.push({ kind: "search", label: T.step.search, detail: searched.join(" · ") })

  const offers = suggestions.flatMap((x) => x.offers)
  if (offers.length) {
    const partners = new Set(offers.map((o) => o.partnerId)).size
    const inZone = new Set(offers.filter((o) => o.inZone).map((o) => o.partnerId)).size
    steps.push({
      kind: "offers",
      label: T.step.offers,
      detail: T.step.compared(offers.length, partners, inZone, s.province ?? ""),
    })
  }
  if (s.from && s.to && (ready || facts.length)) {
    steps.push({
      kind: "dates",
      label: T.step.dates,
      detail: T.step.period(shortDate(s.from), shortDate(s.to), daysInclusive(s.from, s.to)),
    })
  }
  if (suggestions.length) {
    const points = suggestions[0].toVerify.length
    steps.push({ kind: "check", label: T.step.check, detail: T.step.points(points) })
  }

  const newNeeds = needs.filter((n) => !neededBefore.includes(n.category))
  const pick = suggestions.map((x) => `${x.modelId}:${x.offers[0]?.offerId ?? ""}`).join(",")
  const samePick = Boolean(pick) && before.picked === pick
  s.picked = pick || undefined
  return {
    mode: "demo",
    reply: writeReply({
      s,
      locale,
      facts,
      needs,
      newNeeds,
      askNow,
      suggestions,
      unmet,
      ready,
      models,
      samePick,
    }),
    steps,
    questions: askNow,
    state: s,
    summary: summaryOf(s, locale),
    suggestions,
    unmet,
    remaining: qs.slice(2).map((q) => q.text),
  }
}

function writeReply(a: {
  s: AssistantState
  locale: Locale
  facts: string[]
  needs: Need[]
  newNeeds: Need[]
  askNow: AssistantQuestion[]
  suggestions: AssistantSuggestion[]
  unmet: string[]
  ready: boolean
  models: Model[]
  samePick: boolean
}) {
  const { s, locale, facts, needs, newNeeds, askNow, suggestions, unmet, ready, models, samePick } =
    a
  const R = TEXT[locale].reply
  const T = TEXT[locale]
  const fmt = numberFormat(locale)
  const eur = euros(locale)
  const turn = s.turns
  const parts: string[] = []

  if (!facts.length && turn === 1) parts.push(R.hello)
  else if (!facts.length) parts.push(vary(R.nothingNew, turn))
  else parts.push(vary(R.ack, turn, joinList(facts, T.and)))

  if (newNeeds.length) {
    const cats = needs.map((n) =>
      n.optional ? T.optionalCat(T.cat[n.category]) : T.cat[n.category]
    )
    parts.push(vary(R.plan, turn, joinList(cats, T.and)))
  }

  if (ready && suggestions.length && samePick) {
    const main = suggestions.find((x) => !x.optional) ?? suggestions[0]
    parts.push(vary(R.unchanged, turn, main.label))
  } else if (ready && suggestions.length) {
    const main = suggestions.find((x) => !x.optional) ?? suggestions[0]
    const best = main.offers[0]
    const fit: string[] = []
    const widthMm = models.find((m) => m.id === main.modelId)?.specs.width_mm
    if (s.accessWidthM && s.accessWidthM < 99 && typeof widthMm === "number")
      fit.push(R.fitsWidth(fmt(widthMm / 1000), fmt(s.accessWidthM)))
    if (main.category === "excavators" && s.depthM) fit.push(R.digs(fmt(s.depthM)))
    if ((main.category === "platforms" || main.category === "telehandlers") && s.heightM)
      fit.push(R.reaches(fmt(s.heightM)))
    parts.push(R.best(main.label, fit.length ? joinList(fit, T.and) : null))
    if (best?.day)
      parts.push(
        R.price(
          eur(best.day),
          stripDemo(best.partnerName),
          best.inZone === false,
          main.offers.length
        )
      )
    const others = suggestions.filter((x) => x !== main).map((x) => x.label)
    if (others.length) parts.push(R.alsoAdded(joinList(others, T.and)))
  }
  if (unmet.length) parts.push(`${unmet.join(" ")} ${R.alternatives}`)

  // "S.r.l." at the end of a sentence: no second full stop.
  let text = parts.join(" ").replace(/\.\.(\s|$)/g, ".$1")
  if (askNow.length) {
    text += `\n\n${askNow.length === 1 ? vary(R.askOne, turn) : vary(R.askMany, turn)}\n`
    text += askNow.map((q) => `• ${q.text}`).join("\n")
  } else if (ready) {
    text += `\n\n${R.ready}`
  }
  return text
}

// ---- Texts --------------------------------------------------------------------

type Texts = {
  turin: string
  and: string
  ground: { sloping: string; rough: string; flat: string }
  job: Record<string, string>
  cat: Record<string, string>
  cats: Record<string, string>
  optionalCat: (cat: string) => string
  why: Record<
    | "demolish"
    | "rubble"
    | "dig"
    | "spoil"
    | "haul"
    | "compact"
    | "load"
    | "height"
    | "lift"
    | "crane"
    | "power",
    string
  >
  q: Record<
    | "location"
    | "dates"
    | "jobs"
    | "depth"
    | "access"
    | "height"
    | "indoor"
    | "lift"
    | "crane"
    | "power"
    | "area"
    | "ground"
    | "transport"
    | "operator",
    readonly [string, readonly string[]]
  >
  fact: {
    site: (place: string) => string
    period: (from: string, to: string) => string
    start: (from: string) => string
    depth: (m: string) => string
    passage: (m: string) => string
    noLimit: string
    height: (m: string) => string
    load: (kg: string) => string
    power: (kva: string) => string
    area: (m2: string) => string
    ground: (ground: string) => string
    indoors: string
    outdoors: string
    delivery: string
    collect: string
    operator: string
    dryHire: string
  }
  summary: Record<
    | "location"
    | "period"
    | "start"
    | "work"
    | "depth"
    | "passage"
    | "height"
    | "load"
    | "power"
    | "area"
    | "ground"
    | "setting"
    | "transport"
    | "operator"
    | "noLimit"
    | "indoors"
    | "outdoors"
    | "yes"
    | "collect"
    | "dryHire",
    string
  >
  failed: Record<Failed["kind"], (value: string) => string>
  unmet: (cat: string, what: string) => string
  fitsPassage: (m: string) => string
  verify: Record<
    | "passages"
    | "ground"
    | "utilities"
    | "depth"
    | "platforms"
    | "telehandlers"
    | "cranes"
    | "generators"
    | "rollers"
    | "dumpers"
    | "availability"
    | "suitability",
    string
  >
  step: {
    read: string
    nothing: string
    search: string
    searched: (cats: string, total: number, fitting: number) => string
    offers: string
    compared: (offers: number, partners: number, inZone: number, prov: string) => string
    dates: string
    period: (from: string, to: string, days: number) => string
    check: string
    points: (n: number) => string
  }
  reply: {
    hello: string
    nothingNew: (() => string)[]
    ack: ((facts: string) => string)[]
    plan: ((cats: string) => string)[]
    fitsWidth: (width: string, passage: string) => string
    digs: (m: string) => string
    reaches: (m: string) => string
    best: (label: string, fit: string | null) => string
    price: (price: string, partner: string, outside: boolean, offers: number) => string
    alsoAdded: (labels: string) => string
    unchanged: ((label: string) => string)[]
    alternatives: string
    askOne: (() => string)[]
    askMany: (() => string)[]
    ready: string
  }
}

const EN: Texts = {
  turin: "Turin",
  and: "and",
  ground: { sloping: "sloping", rough: "rough / unpaved", flat: "flat" },
  job: {
    dig: "digging",
    demolition: "demolition",
    compaction: "compaction",
    material: "moving material",
    haulage: "moving soil/rubble on site",
    height: "work at height",
    lifting: "lifting materials",
    crane: "crane lifting",
    power: "power supply",
  },
  cat: {
    excavators: "an excavator",
    loaders: "a loader",
    backhoes: "a backhoe loader",
    dumpers: "a dumper",
    telehandlers: "a telehandler",
    platforms: "an aerial work platform",
    rollers: "a compaction roller",
    cranes: "a mobile crane",
    generators: "a generator",
  },
  cats: {
    excavators: "excavators",
    loaders: "loaders",
    backhoes: "backhoe loaders",
    dumpers: "dumpers",
    telehandlers: "telehandlers",
    platforms: "aerial platforms",
    rollers: "rollers",
    cranes: "mobile cranes",
    generators: "generators",
  },
  optionalCat: (cat) => `${cat} (optional)`,
  why: {
    demolish: "To demolish with a hydraulic breaker fitted to the arm",
    rubble: "To carry the rubble to the skip or loading point",
    dig: "To carry out the digging",
    spoil: "To move the excavated soil around the site",
    haul: "To carry soil and rubble within the site",
    compact: "To compact the sub-base or asphalt",
    load: "To load and move loose material",
    height: "To work at height from a basket",
    lift: "To lift and place pallets and materials",
    crane: "To lift heavy or bulky loads",
    power: "To power the site",
  },
  q: {
    location: ["Where is the site?", ["Turin", "Moncalieri", "Cuneo", "Asti"]],
    dates: [
      "When do you need the machines, and for how long?",
      ["From Monday for 5 days", "From next week for 2 weeks", "From Monday for a month"],
    ],
    jobs: [
      "What kind of work do you need to do?",
      ["Digging", "Demolition", "Compaction", "Work at height", "Lifting pallets", "Site power"],
    ],
    depth: ["How deep do you need to dig?", ["Depth 1.5 m", "Depth 3 m", "Depth 5 m"]],
    access: [
      "What's the narrowest passage into the site?",
      ["Passage 1 m", "Passage 1.5 m", "Passage 2.5 m", "No limit"],
    ],
    height: [
      "What working height do you need (the operator's platform level)?",
      ["Height 8 m", "Height 12 m", "Height 15 m", "Height 20 m"],
    ],
    indoor: [
      "Is the work indoors on a flat floor, or outdoors?",
      ["Indoors, flat floor", "Outdoors, rough ground"],
    ],
    lift: [
      "What load do you need to lift, and to what height?",
      ["2 t to 10 m", "3 t to 14 m", "4 t to 20 m"],
    ],
    crane: [
      "What is the heaviest load, and how far is it from the crane?",
      ["5 t at 10 m", "10 t at 12 m", "Not sure"],
    ],
    power: [
      "How much electrical power do you need?",
      ["100 kVA", "200 kVA", "250 kVA", "Not sure"],
    ],
    area: ["How large is the area to compact?", ["200 sqm", "1000 sqm", "5000 sqm"]],
    ground: ["What's the ground like?", ["Flat ground", "Sloping", "Rough / muddy"]],
    transport: [
      "Do you need delivery to the site?",
      ["Yes, delivery and pickup", "No, I'll collect from the depot"],
    ],
    operator: [
      "Do you want an operator with the machine?",
      ["Yes, with operator", "No, dry hire (without operator)"],
    ],
  },
  fact: {
    site: (place) => `site in ${place}`,
    period: (from, to) => `from ${from} to ${to}`,
    start: (from) => `starting ${from}`,
    depth: (m) => `${m} m deep`,
    passage: (m) => `a ${m} m passage`,
    noLimit: "no access limits",
    height: (m) => `working height ${m} m`,
    load: (kg) => `a ${kg} kg load`,
    power: (kva) => `${kva} kVA`,
    area: (m2) => `${m2} m²`,
    ground: (g) => `${g} ground`,
    indoors: "indoors",
    outdoors: "outdoors",
    delivery: "delivery to site",
    collect: "collection from the depot",
    operator: "with operator",
    dryHire: "dry hire",
  },
  summary: {
    location: "Location",
    period: "Period",
    start: "Start",
    work: "Work",
    depth: "Depth",
    passage: "Narrowest passage",
    height: "Working height",
    load: "Load",
    power: "Power",
    area: "Area",
    ground: "Ground",
    setting: "Setting",
    transport: "Transport",
    operator: "Operator",
    noLimit: "no limit",
    indoors: "indoors",
    outdoors: "outdoors",
    yes: "yes",
    collect: "no, collect from the depot",
    dryHire: "no (dry hire)",
  },
  failed: {
    passage: (v) => `a ${v} m passage`,
    depth: (v) => `a digging depth of ${v} m`,
    height: (v) => `a height of ${v} m`,
    power: (v) => `a power of ${v} kVA`,
  },
  unmet: (cat, what) => `${cat}: no machine in the catalogue meets ${what}.`,
  fitsPassage: (m) => `Fits through the ${m} m passage you mentioned.`,
  verify: {
    passages: "Width of the passages and the site entrance",
    ground: "Ground: slope, load-bearing capacity and manoeuvring space",
    utilities: "Underground utilities (gas, water, electricity) in the digging area",
    depth: "Actual digging depth",
    platforms: "Overhead power lines and obstacles; the operator's MEWP training",
    telehandlers: "Load chart at the required height and reach",
    cranes: "Lift plan: working radius, parking area, use of public land",
    generators: "Load consumption and inrush currents; connection by a qualified electrician",
    rollers: "Vibration near buildings and utilities",
    dumpers: "Ramps and slopes to be driven fully loaded",
    availability: "Availability in the period: to be confirmed by the partner",
    suitability:
      "Technical suitability and safety of the machine for the job: to be confirmed with the competent professional (e.g. site manager, safety coordinator)",
  },
  step: {
    read: "Understanding your request",
    nothing: "No new details in this message",
    search: "Searching the Machina catalogue",
    searched: (cats, total, fitting) =>
      `${cats}: ${fitting} of ${total} ${total === 1 ? "model fits" : "models fit"}`,
    offers: "Comparing rental offers",
    compared: (offers, partners, inZone, prov) =>
      `${offers} ${offers === 1 ? "offer" : "offers"} from ${partners} rental ${partners === 1 ? "company" : "companies"}` +
      (prov ? ` · ${inZone} ${inZone === 1 ? "serves" : "serve"} ${prov}` : ""),
    dates: "Checking the rental period",
    period: (from, to, days) => `${from} → ${to} · ${days} ${days === 1 ? "day" : "days"}`,
    check: "Safety and site checks",
    points: (n) => `${n} points for you to confirm before hiring`,
  },
  reply: {
    hello:
      "Hi! I'm the Machina assistant. Tell me what you need to do, where the site is and when: I'll pick the right machines from the catalogue and compare the rental offers for you.",
    nothingNew: [
      () => "I didn't find any new details in that.",
      () => "Sorry, I didn't catch anything new there.",
    ],
    ack: [
      (facts) => `Got it: ${facts}.`,
      (facts) => `Thanks, noted: ${facts}.`,
      (facts) => `Perfect: ${facts}.`,
    ],
    plan: [
      (cats) => `For this job you'll need ${cats}.`,
      (cats) => `This job calls for ${cats}.`,
      (cats) => `I'd plan on ${cats}.`,
    ],
    fitsWidth: (width, passage) =>
      `it's ${width} m wide, so it fits through your ${passage} m passage`,
    digs: (m) => `it digs deeper than the ${m} m you need`,
    reaches: (m) => `it reaches the ${m} m you need`,
    best: (label, fit) =>
      fit ? `The best match is the ${label}: ${fit}.` : `The best match is the ${label}.`,
    price: (price, partner, outside, offers) =>
      `The best price is ${price}/day from ${partner}${outside ? " (outside your area)" : ""}` +
      (offers > 1
        ? `, and I've listed ${offers - 1} more ${offers === 2 ? "offer" : "offers"} to compare.`
        : "."),
    alsoAdded: (labels) => `I've also added the ${labels}.`,
    unchanged: [
      (label) => `My suggestion doesn't change: the ${label} is still the best fit.`,
      (label) => `That doesn't change the choice: the ${label} remains the best match.`,
    ],
    alternatives: "You can still send the request: rental companies may propose alternatives.",
    askOne: [() => "One more thing:", () => "Just one question:"],
    askMany: [
      () => "To pick the right machines I need a couple more details:",
      () => "A couple of questions before I choose:",
      () => "To narrow it down:",
    ],
    ready:
      "I have everything I need. Check the machines on the right and I'll prepare the request for the rental companies.",
  },
}

const IT: Texts = {
  turin: "Torino",
  and: "e",
  ground: { sloping: "in pendenza", rough: "accidentato / sterrato", flat: "piano" },
  job: {
    dig: "scavo",
    demolition: "demolizione",
    compaction: "compattazione",
    material: "movimentazione materiale",
    haulage: "trasporto di terra/macerie in cantiere",
    height: "lavori in quota",
    lifting: "sollevamento materiali",
    crane: "sollevamento con gru",
    power: "alimentazione elettrica",
  },
  cat: {
    excavators: "un escavatore",
    loaders: "una pala",
    backhoes: "una terna",
    dumpers: "un dumper",
    telehandlers: "un sollevatore telescopico",
    platforms: "una piattaforma aerea",
    rollers: "un rullo compattatore",
    cranes: "un'autogru",
    generators: "un generatore",
  },
  cats: {
    excavators: "Escavatori",
    loaders: "Pale",
    backhoes: "Terne",
    dumpers: "Dumper",
    telehandlers: "Sollevatori telescopici",
    platforms: "Piattaforme aeree",
    rollers: "Rulli",
    cranes: "Autogru",
    generators: "Generatori",
  },
  optionalCat: (cat) => `${cat} (facoltativo)`,
  why: {
    demolish: "Per demolire con il martello idraulico montato sul braccio",
    rubble: "Per portare le macerie al cassone o al punto di carico",
    dig: "Per eseguire lo scavo",
    spoil: "Per spostare la terra di scavo in cantiere",
    haul: "Per trasportare terra e macerie in cantiere",
    compact: "Per compattare il sottofondo o l'asfalto",
    load: "Per caricare e spostare materiale sfuso",
    height: "Per lavorare in quota dal cestello",
    lift: "Per sollevare e posizionare bancali e materiali",
    crane: "Per sollevare carichi pesanti o ingombranti",
    power: "Per alimentare il cantiere",
  },
  q: {
    location: ["Dove si trova il cantiere?", ["Torino", "Moncalieri", "Cuneo", "Asti"]],
    dates: [
      "Quando ti servono le macchine, e per quanto tempo?",
      [
        "Da lunedì per 5 giorni",
        "Dalla prossima settimana per 2 settimane",
        "Da lunedì per un mese",
      ],
    ],
    jobs: [
      "Che tipo di lavoro devi fare?",
      [
        "Scavo",
        "Demolizione",
        "Compattazione",
        "Lavori in quota",
        "Sollevare bancali",
        "Corrente in cantiere",
      ],
    ],
    depth: [
      "Quanto devi scavare in profondità?",
      ["Profondità 1,5 m", "Profondità 3 m", "Profondità 5 m"],
    ],
    access: [
      "Qual è il passaggio più stretto per entrare in cantiere?",
      ["Passaggio 1 m", "Passaggio 1,5 m", "Passaggio 2,5 m", "Nessun limite"],
    ],
    height: [
      "Che altezza di lavoro ti serve (il piano di calpestio dell'operatore)?",
      ["Altezza 8 m", "Altezza 12 m", "Altezza 15 m", "Altezza 20 m"],
    ],
    indoor: [
      "Il lavoro è al chiuso su pavimento piano, o all'aperto?",
      ["Al chiuso, pavimento piano", "All'aperto, terreno accidentato"],
    ],
    lift: [
      "Che carico devi sollevare, e a che altezza?",
      ["2 t a 10 m", "3 t a 14 m", "4 t a 20 m"],
    ],
    crane: [
      "Qual è il carico più pesante, e a che distanza dalla gru?",
      ["5 t a 10 m", "10 t a 12 m", "Non so"],
    ],
    power: ["Quanta potenza elettrica ti serve?", ["100 kVA", "200 kVA", "250 kVA", "Non so"]],
    area: ["Quanto è grande l'area da compattare?", ["200 mq", "1000 mq", "5000 mq"]],
    ground: ["Com'è il terreno?", ["Terreno piano", "In pendenza", "Accidentato / fangoso"]],
    transport: [
      "Ti serve la consegna in cantiere?",
      ["Sì, consegna e ritiro", "No, ritiro io in deposito"],
    ],
    operator: [
      "Vuoi un operatore con la macchina?",
      ["Sì, con operatore", "No, nolo a freddo (senza operatore)"],
    ],
  },
  fact: {
    site: (place) => `cantiere a ${place}`,
    period: (from, to) => `dal ${from} al ${to}`,
    start: (from) => `inizio il ${from}`,
    depth: (m) => `profondità ${m} m`,
    passage: (m) => `passaggio di ${m} m`,
    noLimit: "accesso senza limiti",
    height: (m) => `altezza di lavoro ${m} m`,
    load: (kg) => `carico di ${kg} kg`,
    power: (kva) => `${kva} kVA`,
    area: (m2) => `${m2} m²`,
    ground: (g) => `terreno ${g}`,
    indoors: "al chiuso",
    outdoors: "all'aperto",
    delivery: "consegna in cantiere",
    collect: "ritiro in deposito",
    operator: "con operatore",
    dryHire: "nolo a freddo",
  },
  summary: {
    location: "Luogo",
    period: "Periodo",
    start: "Inizio",
    work: "Lavoro",
    depth: "Profondità",
    passage: "Passaggio più stretto",
    height: "Altezza di lavoro",
    load: "Carico",
    power: "Potenza",
    area: "Superficie",
    ground: "Terreno",
    setting: "Ambiente",
    transport: "Trasporto",
    operator: "Operatore",
    noLimit: "nessun limite",
    indoors: "al chiuso",
    outdoors: "all'aperto",
    yes: "sì",
    collect: "no, ritiro in deposito",
    dryHire: "no (nolo a freddo)",
  },
  failed: {
    passage: (v) => `un passaggio di ${v} m`,
    depth: (v) => `una profondità di scavo di ${v} m`,
    height: (v) => `un'altezza di ${v} m`,
    power: (v) => `una potenza di ${v} kVA`,
  },
  unmet: (cat, what) => `${cat}: nessuna macchina del catalogo soddisfa ${what}.`,
  fitsPassage: (m) => `Passa dal passaggio di ${m} m che hai indicato.`,
  verify: {
    passages: "Larghezza dei passaggi e dell'ingresso del cantiere",
    ground: "Terreno: pendenza, portanza e spazio di manovra",
    utilities: "Sottoservizi (gas, acqua, elettricità) nell'area di scavo",
    depth: "Profondità di scavo effettiva",
    platforms: "Linee elettriche aeree e ostacoli; formazione PLE dell'operatore",
    telehandlers: "Diagramma di carico all'altezza e allo sbraccio richiesti",
    cranes:
      "Piano di sollevamento: raggio di lavoro, area di stazionamento, occupazione di suolo pubblico",
    generators:
      "Assorbimenti e correnti di spunto; allacciamento da parte di un elettricista abilitato",
    rollers: "Vibrazioni vicino a edifici e sottoservizi",
    dumpers: "Rampe e pendenze da percorrere a pieno carico",
    availability: "Disponibilità nel periodo: da confermare con il noleggiatore",
    suitability:
      "Idoneità tecnica e sicurezza della macchina per il lavoro: da confermare con il professionista competente (es. direttore lavori, coordinatore della sicurezza)",
  },
  step: {
    read: "Analizzo la richiesta",
    nothing: "Nessun nuovo dettaglio in questo messaggio",
    search: "Cerco nel catalogo Machina",
    searched: (cats, total, fitting) =>
      `${cats}: ${fitting} su ${total} ${total === 1 ? "modello adatto" : "modelli adatti"}`,
    offers: "Confronto le offerte di noleggio",
    compared: (offers, partners, inZone, prov) =>
      `${offers} ${offers === 1 ? "offerta" : "offerte"} da ${partners} ${partners === 1 ? "noleggiatore" : "noleggiatori"}` +
      (prov ? ` · ${inZone} ${inZone === 1 ? "serve" : "servono"} ${prov}` : ""),
    dates: "Verifico il periodo di noleggio",
    period: (from, to, days) => `${from} → ${to} · ${days} ${days === 1 ? "giorno" : "giorni"}`,
    check: "Controlli di sicurezza e cantiere",
    points: (n) => `${n} punti da confermare prima del noleggio`,
  },
  reply: {
    hello:
      "Ciao! Sono l'assistente Machina. Dimmi cosa devi fare, dove si trova il cantiere e quando: scelgo le macchine giuste dal catalogo e confronto per te le offerte di noleggio.",
    nothingNew: [
      () => "Non ho trovato nuovi dettagli nel messaggio.",
      () => "Scusa, non ho colto informazioni nuove.",
    ],
    ack: [
      (facts) => `Perfetto: ${facts}.`,
      (facts) => `Ricevuto: ${facts}.`,
      (facts) => `Ok, ho preso nota: ${facts}.`,
    ],
    plan: [
      (cats) => `Per questo lavoro ti servono ${cats}.`,
      (cats) => `Per questo lavoro ti consiglio ${cats}.`,
      (cats) => `Qui servono ${cats}.`,
    ],
    fitsWidth: (width, passage) =>
      `è larga ${width} m, quindi passa dal tuo passaggio di ${passage} m`,
    digs: (m) => `scava oltre i ${m} m che ti servono`,
    reaches: (m) => `arriva ai ${m} m che ti servono`,
    best: (label, fit) =>
      fit ? `La scelta migliore è ${label}: ${fit}.` : `La scelta migliore è ${label}.`,
    price: (price, partner, outside, offers) =>
      `Il prezzo migliore è ${price}/giorno da ${partner}${outside ? " (fuori dalla tua zona)" : ""}` +
      (offers > 1
        ? offers === 2
          ? ", e ti ho elencato un'altra offerta da confrontare."
          : `, e ti ho elencato altre ${offers - 1} offerte da confrontare.`
        : "."),
    alsoAdded: (labels) => `Ho aggiunto anche ${labels}.`,
    unchanged: [
      (label) => `La mia proposta non cambia: ${label} resta la scelta migliore.`,
      (label) => `Questo non cambia la scelta: ${label} resta la più adatta.`,
    ],
    alternatives:
      "Puoi comunque inviare la richiesta: i noleggiatori possono proporre alternative.",
    askOne: [() => "Un'ultima cosa:", () => "Solo una domanda:"],
    askMany: [
      () => "Per scegliere le macchine giuste mi servono ancora un paio di dettagli:",
      () => "Un paio di domande prima di scegliere:",
      () => "Per restringere la scelta:",
    ],
    ready:
      "Ho tutto quello che mi serve. Controlla le macchine qui a destra e preparo la richiesta per i noleggiatori.",
  },
}

const TEXT: Record<Locale, Texts> = { en: EN, it: IT }
