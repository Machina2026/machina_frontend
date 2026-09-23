import type {
  Accessory,
  Client,
  Line,
  Model,
  Offer,
  OfferAccessory,
  OperatorMode,
  Partner,
  Quote,
  RentalRequest,
  Settings,
  TransportMode,
  User,
} from "@/lib/machina/types"

import { hashPassword } from "./auth"
import { addDays, timestampAt, today } from "./dates"
import { CATEGORIES } from "./meta"
import * as S from "./services"
import type { Store } from "./store"

// Demo data. Companies, people, addresses, prices and availability are fictitious.
// Model specs are indicative (orders of magnitude): always check the
// manufacturer's sheet and the rental company.

export const DEMO_PASSWORD = "demo1234"
const IMG = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.image]))

const d = (offset: number) => addDays(today(), offset)

function model(
  id: string,
  category: string,
  subtype: string,
  brand: string,
  name: string,
  description: string,
  specs: Model["specs"],
  jobs: string[],
  limits: string[]
): Model {
  return {
    id,
    category,
    subtype,
    brand,
    model: name,
    description,
    specs,
    jobs,
    limits,
    image: IMG[category],
    owner: "machina",
    demo: true,
  }
}

const MODELS: Model[] = [
  model(
    "m-kx019",
    "excavators",
    "Mini excavator",
    "Kubota",
    "KX019-4",
    "Mini excavator of about 1.7 t with an extendable undercarriage: fits through narrow passages and works in tight spaces.",
    {
      weight_kg: 1700,
      width_mm: 990,
      dig_depth_m: 2.4,
      reach_m: 4.0,
      power_kw: 11,
      rotation: "Short tail",
    },
    [
      "Digging for utility connections",
      "Trenches and small foundations",
      "Work in courtyards and gardens",
      "Light demolition with a breaker",
    ],
    [
      "Limited digging depth (about 2.4 m)",
      "Reduced stability on slopes: check with the partner",
      "Not suited to large earthmoving volumes",
    ]
  ),
  model(
    "m-cat308",
    "excavators",
    "Midi excavator",
    "Caterpillar",
    "308 CR",
    "Short-tail midi excavator of about 8.5 t, suited to urban sites with limited space.",
    {
      weight_kg: 8600,
      width_mm: 2320,
      dig_depth_m: 4.6,
      reach_m: 7.2,
      power_kw: 52,
      rotation: "Short tail",
    },
    [
      "Foundation digging",
      "Medium earthmoving",
      "Demolition with a hydraulic breaker",
      "Pipe laying",
    ],
    [
      "Needs passages of at least 2.5 m",
      "Transported on a low loader",
      "Check load-bearing capacity of slabs and ramps",
    ]
  ),
  model(
    "m-pc210",
    "excavators",
    "Crawler excavator",
    "Komatsu",
    "PC210LC-11",
    "Crawler excavator of about 22 t for large-volume digging and earthmoving.",
    {
      weight_kg: 22000,
      width_mm: 3080,
      dig_depth_m: 6.6,
      reach_m: 9.9,
      power_kw: 123,
      rotation: "Standard",
    },
    [
      "Earthmoving",
      "Deep digging",
      "Earthworks over large areas",
      "Heavy demolition with a breaker",
    ],
    ["Oversize transport must be planned", "Large swing radius", "Not suited to tight urban spaces"]
  ),
  model(
    "m-3cx",
    "backhoes",
    "Backhoe loader",
    "JCB",
    "3CX",
    "Wheeled backhoe loader with a front loader and rear excavator; moves quickly between work points.",
    { weight_kg: 8100, width_mm: 2350, dig_depth_m: 5.9, bucket_m3: 1.0, power_kw: 55 },
    [
      "Digging for roadside utilities",
      "Loading material",
      "Backfilling",
      "Work at several points on the same site",
    ],
    ["Needs stabilisers to dig", "Needs a large manoeuvring area"]
  ),
  model(
    "m-s450",
    "loaders",
    "Skid steer",
    "Bobcat",
    "S450",
    "Compact skid steer for moving material, site cleaning and levelling in tight spaces.",
    { weight_kg: 2600, width_mm: 1650, load_kg: 620, bucket_m3: 0.33, height_m: 2.3, power_kw: 36 },
    ["Moving aggregates", "Site cleaning", "Levelling", "Drilling with an attachment"],
    ["Limited capacity (about 620 kg)", "Not recommended on steep slopes"]
  ),
  model(
    "m-l60h",
    "loaders",
    "Wheel loader",
    "Volvo",
    "L60H",
    "Mid-size wheel loader for loading trucks, managing stockpiles and moving material on yards.",
    {
      weight_kg: 11400,
      width_mm: 2500,
      load_kg: 7500,
      bucket_m3: 2.0,
      height_m: 2.8,
      power_kw: 115,
    },
    ["Loading trucks", "Managing aggregate stockpiles", "Earthworks on yards"],
    ["Needs a large manoeuvring area", "Not suited to digging"]
  ),
  model(
    "m-dw30",
    "dumpers",
    "Wheeled dumper",
    "Wacker Neuson",
    "DW30",
    "4×4 wheeled dumper with a payload of about 3 t for moving soil and rubble around the site.",
    {
      load_kg: 3000,
      weight_kg: 1900,
      width_mm: 1650,
      power_kw: 19,
      dump: "Front",
      drive: "Wheeled 4×4",
    },
    ["Moving excavated soil", "Demolition rubble", "Aggregates and concrete on site"],
    ["Not approved for public roads (check)", "Take care on ramps and slopes when fully loaded"]
  ),
  model(
    "m-c12r",
    "dumpers",
    "Tracked dumper",
    "Yanmar",
    "C12R",
    "Compact tracked dumper with a payload of about 1.2 t, suited to soft ground and narrow passages.",
    {
      load_kg: 1200,
      weight_kg: 1500,
      width_mm: 1080,
      power_kw: 15,
      dump: "Front tipping",
      drive: "Tracked",
    },
    ["Moving soil in courtyards and gardens", "Muddy or soft ground", "Narrow passages"],
    ["Low speed", "Limited payload"]
  ),
  model(
    "m-mt1440",
    "telehandlers",
    "Fixed telehandler",
    "Manitou",
    "MT 1440",
    "Fixed telehandler with 4 t capacity and about 14 m lift height for moving pallets and material to upper floors.",
    {
      load_kg: 4000,
      height_m: 13.7,
      reach_m: 10.2,
      weight_kg: 11000,
      width_mm: 2420,
      rotation: "Fixed",
    },
    ["Moving pallets", "Material to upper floors", "Loading and unloading trucks"],
    [
      "Capacity drops with height and reach: check the load chart",
      "Needs level, load-bearing ground",
    ]
  ),
  model(
    "m-roto4026",
    "telehandlers",
    "Rotating telehandler",
    "Merlo",
    "Roto 40.26 MCSS",
    "Rotating telehandler with stabilisers: about 26 m lift height and continuous rotation.",
    {
      load_kg: 4000,
      height_m: 25.9,
      reach_m: 21.5,
      weight_kg: 17500,
      width_mm: 2480,
      rotation: "360° rotating",
    },
    [
      "Lifting materials at height",
      "Work with a man basket (with attachment)",
      "Acts as a small crane with a jib",
    ],
    [
      "Use as a MEWP only with an approved basket and specific training",
      "Check the stabiliser footprint",
    ]
  ),
  model(
    "m-3246es",
    "platforms",
    "Scissor lift",
    "JLG",
    "3246ES",
    "Electric scissor lift with about 11.75 m working height, for indoor work on flat surfaces.",
    { height_m: 11.75, load_kg: 318, width_mm: 1170, weight_kg: 2860, power_source: "Electric" },
    ["Services and suspended ceilings", "Warehouse maintenance", "Work on flat floors"],
    ["Flat, firm surfaces only", "Not suited to rough ground", "No side outreach"]
  ),
  model(
    "m-z4525",
    "platforms",
    "Articulating boom",
    "Genie",
    "Z-45/25J DC",
    "Electric articulating boom with about 15.7 m working height that reaches over obstacles.",
    {
      height_m: 15.7,
      reach_m: 7.5,
      load_kg: 227,
      width_mm: 1790,
      weight_kg: 6700,
      power_source: "Electric",
    },
    ["Facades with obstacles", "Warehouse maintenance", "Services at height"],
    ["Flat, firm ground", "Limited basket capacity"]
  ),
  model(
    "m-660sj",
    "platforms",
    "Telescopic boom",
    "JLG",
    "660SJ",
    "4×4 diesel telescopic boom with about 22 m working height and large outreach.",
    {
      height_m: 22.3,
      reach_m: 17.1,
      load_kg: 230,
      width_mm: 2490,
      weight_kg: 10900,
      power_source: "Diesel",
    },
    ["Facades and roofs", "Outdoor work at height", "Unpaved site ground"],
    ["Check for overhead power lines", "Large size and weight"]
  ),
  model(
    "m-bw120",
    "rollers",
    "Tandem roller",
    "Bomag",
    "BW 120 AD-5",
    "Vibrating tandem roller of about 2.7 t for asphalt and sub-bases on small and medium areas.",
    { weight_kg: 2700, width_mm: 1200, power_kw: 24, type: "Vibrating tandem" },
    ["Asphalt compaction", "Sub-bases for pavements and courtyards", "Road repairs"],
    ["Not suited to large areas", "Vibration near buildings and utilities: assess first"]
  ),
  model(
    "m-h13i",
    "rollers",
    "Single drum roller",
    "Hamm",
    "H13i",
    "Single drum roller of about 13 t for compacting embankments, sub-bases and soil.",
    { weight_kg: 13000, width_mm: 2140, power_kw: 115, type: "Smooth single drum" },
    ["Embankments and road sub-bases", "Yards", "Compacting soil and granular fill"],
    ["Not for asphalt", "Transported on a low loader"]
  ),
  model(
    "m-ltm1050",
    "cranes",
    "Mobile crane",
    "Liebherr",
    "LTM 1050-3.1",
    "3-axle 50 t mobile crane with a telescopic boom: hired with an operator (wet hire).",
    { capacity_t: 50, height_m: 38, axles: 3, weight_kg: 36000 },
    ["Placing precast elements", "Lifting beams and trusses", "Placing tanks and containers"],
    [
      "Actual capacity depends on radius and configuration: a lift plan is required",
      "Check the parking and stabiliser area",
    ]
  ),
  model(
    "m-qas250",
    "generators",
    "Diesel generator",
    "Atlas Copco",
    "QAS 250",
    "Soundproofed diesel generator of about 250 kVA to power sites without a grid connection or with high power needs.",
    {
      power_kva: 250,
      weight_kg: 3300,
      dimensions: "about 3.6 × 1.2 × 2.0 m",
      power_source: "Diesel",
      soundproofed: "Yes",
    },
    ["Site power supply", "Tower cranes and plant", "Backup power"],
    [
      "Fuel excluded",
      "Check the inrush currents of the loads",
      "Connection by a qualified electrician",
    ]
  ),
]

const acc = (
  id: string,
  name: string,
  group: string,
  compatibleModelIds: string[],
  description: string
): Accessory => ({
  id,
  name,
  group,
  compatibleModelIds,
  description,
  demo: true,
})

const ACCESSORIES: Accessory[] = [
  acc(
    "a-brk100",
    "Hydraulic breaker ~100 kg",
    "Demolition",
    ["m-kx019"],
    "For light demolition with 1.5–2 t mini excavators."
  ),
  acc(
    "a-brk500",
    "Hydraulic breaker ~500 kg",
    "Demolition",
    ["m-cat308", "m-3cx"],
    "For breaking paving and masonry with 7–10 t machines."
  ),
  acc(
    "a-brk1500",
    "Hydraulic breaker ~1,500 kg",
    "Demolition",
    ["m-pc210"],
    "For heavy demolition with excavators of 20 t and above."
  ),
  acc("a-bkt300", "Narrow bucket 300 mm", "Digging", ["m-kx019"], "For trenches and utilities."),
  acc(
    "a-bkt400",
    "Narrow bucket 400 mm",
    "Digging",
    ["m-cat308", "m-3cx"],
    "For trenches and pipe laying."
  ),
  acc(
    "a-ditch",
    "Tilting ditching bucket",
    "Digging",
    ["m-cat308", "m-pc210"],
    "For profiling, embankments and ditch cleaning."
  ),
  acc(
    "a-auger",
    "Hydraulic auger (Ø 300–600 mm bits)",
    "Drilling",
    ["m-s450"],
    "For pile, fence post and planting holes."
  ),
  acc(
    "a-forks",
    "Pallet forks",
    "Lifting",
    ["m-mt1440", "m-roto4026", "m-l60h"],
    "For moving pallets."
  ),
  acc(
    "a-jib",
    "Jib / extension with hook",
    "Lifting",
    ["m-mt1440", "m-roto4026"],
    "For lifting suspended loads. Check the load chart."
  ),
  acc(
    "a-basket",
    "Approved man basket",
    "Lifting",
    ["m-roto4026"],
    "Turns the rotating telehandler into a MEWP. Requires specific training."
  ),
  acc(
    "a-board",
    "Site power distribution board",
    "Power",
    ["m-qas250"],
    "Board with sockets and protection for power distribution."
  ),
]

function partner(
  id: string,
  name: string,
  city: string,
  province: string,
  address: string,
  zones: string[],
  email: string,
  phone: string,
  planId: string
): Partner {
  return {
    id,
    name,
    vat: `IT0000000000${id.slice(-1)} (fictitious)`,
    address,
    city,
    province,
    zones,
    email,
    pec: email.replace("@", ".pec@"),
    phone,
    planId,
    verified: true,
    demo: true,
    conditions:
      "Demo general conditions: delivery between 7:30 and 17:00; machine returned clean; " +
      "fuel paid by the customer; damage from improper use charged at cost with supporting documents.",
    attachments: [],
    createdAt: timestampAt(-200),
  }
}

const PARTNERS: Partner[] = [
  partner(
    "p1",
    "Noleggi Dora S.r.l. (demo)",
    "Turin",
    "TO",
    "Via dei Cantieri 12 (fictitious address)",
    ["TO", "AT", "CN"],
    "info@noleggidora.demo",
    "011 000 0001",
    "base"
  ),
  partner(
    "p2",
    "Sangone Macchine S.p.A. (demo)",
    "Orbassano",
    "TO",
    "Strada del Sangone 45 (fictitious address)",
    ["TO", "CN"],
    "sales@sangonemacchine.demo",
    "011 000 0002",
    "pro"
  ),
  partner(
    "p3",
    "Canavese Rent S.r.l. (demo)",
    "Ivrea",
    "TO",
    "Corso delle Industrie 8 (fictitious address)",
    ["TO", "BI", "VC", "NO"],
    "rentals@canaveserent.demo",
    "0125 000 003",
    "base"
  ),
]

type OfferOpts = {
  minDays?: number
  hours?: number
  extra?: number | null
  transport?: [TransportMode, number | null]
  operator?: [OperatorMode, number | null]
  deposit?: number | null
  accessories?: OfferAccessory[]
  conditions?: string[]
  units?: number
}

function offer(
  id: string,
  partnerId: string,
  modelId: string,
  day: number,
  week: number | null,
  month: number | null,
  o: OfferOpts = {}
): Offer {
  const zones = PARTNERS.find((p) => p.id === partnerId)!.zones
  const [tMode, tPrice] = o.transport ?? ["fixed", 150]
  const [oMode, oPrice] = o.operator ?? ["unavailable", null]
  return {
    id,
    partnerId,
    modelId,
    prices: { day, week, month },
    minDays: o.minDays ?? 1,
    hoursPerDay: o.hours ?? 8,
    extraHourPrice: o.extra ?? null,
    transport: { mode: tMode, price: tPrice },
    operator: { mode: oMode, pricePerDay: oPrice },
    deposit: o.deposit ?? null,
    accessories: (o.accessories ?? []).map((a) => ({ ...a })),
    conditions: o.conditions ?? [],
    zones,
    units: o.units ?? 1,
    active: true,
    photos: [],
    notes: "",
    demo: true,
    availability: "To be confirmed by the partner",
  }
}

const a = (
  accessoryId: string,
  day: number,
  week: number | null,
  included = false
): OfferAccessory => (included ? { accessoryId, day, week, included } : { accessoryId, day, week })

const OFFERS: Offer[] = [
  offer("o1", "p1", "m-kx019", 110, 480, 1400, {
    transport: ["fixed", 120],
    deposit: 500,
    extra: 15,
    accessories: [a("a-brk100", 45, 190), a("a-bkt300", 0, 0, true)],
    conditions: [
      "Standard and narrow buckets included",
      "Same-day delivery if ordered by 12:00 (to be confirmed)",
    ],
  }),
  offer("o2", "p2", "m-kx019", 105, 500, 1350, {
    minDays: 2,
    transport: ["fixed", 140],
    operator: ["available", 300],
    extra: 14,
    accessories: [a("a-brk100", 40, 180)],
    conditions: ["Minimum rental 2 days", "Operator available on request"],
  }),
  offer("o3", "p1", "m-cat308", 260, 1150, 3500, {
    minDays: 2,
    transport: ["fixed", 280],
    operator: ["available", 330],
    deposit: 1500,
    extra: 30,
    accessories: [a("a-brk500", 95, 420), a("a-bkt400", 20, 80), a("a-ditch", 25, 100)],
    conditions: ["Minimum rental 2 days", "Deposit required from new customers"],
  }),
  offer("o4", "p3", "m-cat308", 250, 1100, 3600, {
    minDays: 3,
    transport: ["on_quote", null],
    operator: ["available", 320],
    extra: 28,
    accessories: [a("a-brk500", 90, 400), a("a-bkt400", 18, 75)],
    conditions: ["Minimum rental 3 days", "Transport priced by distance"],
  }),
  offer("o5", "p2", "m-pc210", 480, 2100, 6500, {
    minDays: 5,
    transport: ["on_quote", null],
    operator: ["available", 350],
    deposit: 3000,
    extra: 55,
    accessories: [a("a-brk1500", 180, 800), a("a-ditch", 35, 150)],
    conditions: ["Minimum rental 5 days", "Oversize transport on quote"],
  }),
  offer("o6", "p1", "m-3cx", 220, 950, 2900, {
    transport: ["fixed", 0],
    operator: ["available", 320],
    extra: 26,
    accessories: [a("a-brk500", 95, 420), a("a-bkt400", 20, 80)],
    conditions: ["Road transfer included within 30 km of the depot"],
  }),
  offer("o7", "p3", "m-s450", 150, 650, 1900, {
    transport: ["fixed", 130],
    operator: ["available", 300],
    extra: 18,
    accessories: [a("a-auger", 60, 260)],
  }),
  offer("o8", "p2", "m-l60h", 350, 1500, 4500, {
    minDays: 2,
    transport: ["fixed", 320],
    operator: ["available", 330],
    deposit: 2000,
    extra: 40,
    accessories: [a("a-forks", 25, 100)],
  }),
  offer("o9", "p1", "m-dw30", 95, 400, 1150, { transport: ["fixed", 110], extra: 12 }),
  offer("o10", "p2", "m-c12r", 90, 380, 1100, { transport: ["fixed", 110], extra: 12 }),
  offer("o11", "p1", "m-mt1440", 190, 850, 2500, {
    transport: ["fixed", 220],
    operator: ["available", 320],
    deposit: 1000,
    extra: 24,
    accessories: [a("a-forks", 0, 0, true), a("a-jib", 30, 130)],
  }),
  offer("o12", "p2", "m-mt1440", 200, 820, 2400, {
    minDays: 2,
    transport: ["fixed", 240],
    operator: ["available", 310],
    extra: 24,
    accessories: [a("a-forks", 0, 0, true)],
  }),
  offer("o13", "p3", "m-roto4026", 380, 1700, 5200, {
    minDays: 2,
    transport: ["fixed", 350],
    operator: ["available", 350],
    deposit: 2500,
    extra: 45,
    accessories: [a("a-forks", 0, 0, true), a("a-jib", 40, 170), a("a-basket", 90, 400)],
  }),
  offer("o14", "p2", "m-3246es", 85, 340, 900, {
    transport: ["fixed", 100],
    extra: 10,
    conditions: ["Batteries charged on delivery"],
  }),
  offer("o15", "p3", "m-3246es", 80, 360, 950, { transport: ["fixed", 120], extra: 10 }),
  offer("o16", "p1", "m-z4525", 170, 720, 2100, {
    transport: ["fixed", 160],
    operator: ["available", 300],
    extra: 20,
  }),
  offer("o17", "p3", "m-660sj", 290, 1250, 3700, {
    minDays: 2,
    transport: ["fixed", 260],
    operator: ["available", 320],
    extra: 32,
  }),
  offer("o18", "p1", "m-bw120", 110, 450, 1300, { transport: ["fixed", 120], extra: 14 }),
  offer("o19", "p3", "m-bw120", 105, 470, 1250, {
    transport: ["fixed", 130],
    operator: ["available", 290],
    extra: 14,
  }),
  offer("o20", "p2", "m-h13i", 330, 1400, 4200, {
    minDays: 3,
    transport: ["on_quote", null],
    operator: ["available", 320],
    extra: 38,
  }),
  offer("o21", "p2", "m-ltm1050", 1600, null, null, {
    hours: 8,
    extra: 190,
    transport: ["fixed", 350],
    operator: ["included", null],
    conditions: [
      "Wet hire: crane operator included",
      "Lift plan by the customer or on quote",
      "Daily rate for 8 hours",
    ],
  }),
  offer("o22", "p1", "m-qas250", 140, 600, 1700, {
    hours: 24,
    transport: ["fixed", 180],
    deposit: 800,
    accessories: [a("a-board", 20, 85)],
    conditions: ["Fuel excluded", "Connection by the customer's qualified electrician"],
  }),
]

function clients(): Client[] {
  return [
    {
      id: "c1",
      name: "Edilizia Monviso S.r.l. (demo)",
      vat: "IT00000000011 (fictitious)",
      address: "Via del Lavoro 3 (fictitious address)",
      city: "Turin",
      province: "TO",
      email: "accounts@ediliziamonviso.demo",
      pec: "ediliziamonviso.pec@demo.it",
      sdi: "0000000",
      phone: "011 000 1001",
      demo: true,
      sites: [
        {
          id: "s1",
          name: "Via Nizza courtyard renovation",
          address: "Via Nizza (fictitious number)",
          city: "Turin",
          province: "TO",
          notes: "Access through a 2.8 m driveway gate. Restricted traffic zone: permit needed.",
        },
        {
          id: "s2",
          name: "New warehouse, Moncalieri",
          address: "Strada Revigliasco (fictitious number)",
          city: "Moncalieri",
          province: "TO",
          notes: "",
        },
        {
          id: "s3",
          name: "Detached house, Chieri",
          address: "Via dei Colli (fictitious number)",
          city: "Chieri",
          province: "TO",
          notes: "Gently sloping ground",
        },
      ],
    },
    {
      id: "c2",
      name: "Costruzioni Val Susa S.r.l. (demo)",
      vat: "IT00000000022 (fictitious)",
      address: "Corso Laghi 10 (fictitious address)",
      city: "Avigliana",
      province: "TO",
      email: "office@costruzionivalsusa.demo",
      pec: "valsusa.pec@demo.it",
      sdi: "0000000",
      phone: "011 000 2002",
      demo: true,
      sites: [
        {
          id: "s4",
          name: "Avigliana warehouse",
          address: "Via Industria (fictitious number)",
          city: "Avigliana",
          province: "TO",
          notes: "",
        },
      ],
    },
  ]
}

const USERS: [string, string, string, User["role"], string | null, string | null][] = [
  ["u-c1", "client@demo.machina.it", "Laura Bianchi", "client", "c1", null],
  ["u-c2", "client2@demo.machina.it", "Paolo Rossi", "client", "c2", null],
  ["u-p1", "dora@demo.machina.it", "Marco Gallo", "partner", null, "p1"],
  ["u-p2", "sangone@demo.machina.it", "Elena Ferrero", "partner", null, "p2"],
  ["u-p3", "canavese@demo.machina.it", "Davide Conti", "partner", null, "p3"],
]

const SETTINGS: Settings = {
  id: "main",
  hypothesisNote: "Demo assumptions: percentages and fees are not final commercial decisions.",
  plans: [
    {
      id: "base",
      name: "Base",
      monthly: 0,
      commissionRate: 0.1,
      description: "No monthly fee, commission on confirmed orders.",
    },
    {
      id: "pro",
      name: "Pro",
      monthly: 149,
      commissionRate: 0.06,
      description: "Monthly fee, reduced commission.",
    },
  ],
}

/** Minimal valid one-page PDF with a line of text (for the demo invoice). */
export function tinyPdf(text: string): Buffer {
  const safe = text.replace(/\(/g, "[").replace(/\)/g, "]")
  const content = `BT /F1 12 Tf 50 780 Td (${safe}) Tj ET`
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ]
  let out = "%PDF-1.4\n"
  const offsets: number[] = []
  objs.forEach((o, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"))
    out += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = Buffer.byteLength(out, "latin1")
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) out += `${String(off).padStart(10, "0")} 00000 n \n`
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(out, "latin1")
}

function backdate(doc: { history: { at: string }[] }, dayOffset: number) {
  doc.history.forEach((h, i) => (h.at = timestampAt(dayOffset, 9 + Math.min(i, 8))))
}

export function seed(store: Store) {
  store.wipe()
  MODELS.forEach((m) => store.put("models", m))
  ACCESSORIES.forEach((x) => store.put("accessories", x))
  PARTNERS.forEach((p) => store.put("partners", { ...p }))
  OFFERS.forEach((o) => store.put("offers", o))
  const [c1, c2] = clients()
  store.put("clients", c1)
  store.put("clients", c2)
  const password = hashPassword(DEMO_PASSWORD)
  const users: Record<string, User> = {}
  for (const [id, email, name, role, clientId, partnerId] of USERS) {
    const u: User = { id, email, name, role, clientId, partnerId, password, demo: true }
    store.put("users", u)
    users[id] = u
  }
  store.put("settings", structuredClone(SETTINGS))

  const quoteOf = (req: { quoteIds: string[] }, partnerId: string) =>
    req.quoteIds
      .map((id) => store.get<Quote>("quotes", id)!)
      .find((q) => q.partnerId === partnerId)!

  const approve = (
    q: Quote,
    user: User,
    validOffset: number,
    tweak?: (lines: Line[]) => void,
    note = ""
  ) => {
    const lines = S.currentVersion(q).lines.map((l) => ({ ...l }))
    for (const l of lines)
      if (l.unitPrice === null) l.unitPrice = l.type === "transport" ? 300 : 280
    tweak?.(lines)
    return S.partnerRevise(store, user, q, { lines, validUntil: d(validOffset), note })
  }

  // 1) Multi-partner request (via the assistant): excavator + breaker, dumper, roller.
  const r1 = S.createRequest(store, users["u-c1"], c1, {
    items: [
      { offerId: "o3", qty: 1, accessoryIds: ["a-brk500"], transport: true, operator: false },
      { offerId: "o10", qty: 1, transport: true },
      { offerId: "o19", qty: 1, transport: true },
    ],
    from: d(8),
    to: d(19),
    siteId: "s1",
    source: "assistant",
    jobDescription:
      "Break up the concrete paving in the courtyard (about 180 m²), dig 50 cm for a new sub-base, " +
      "move the rubble to the skip and compact the new sub-base.",
    needs: {
      accessWidth: "2.8 m driveway gate",
      ground: "Flat, concrete paving",
      schedule: "7:30–17:00, restricted traffic zone",
      notes: "",
    },
  })
  approve(
    quoteOf(r1, "p1"),
    users["u-p1"],
    5,
    (lines) => {
      for (const l of lines) {
        if (l.type === "transport") {
          l.unitPrice = 260
          l.note = "Reduced rate: delivery combined with another site nearby"
        }
      }
    },
    "Availability confirmed. The breaker is delivered with the machine."
  )
  S.partnerDecline(store, users["u-p3"], quoteOf(r1, "p3"), {
    reason:
      "The BW 120 roller is already booked for the requested period. Available from the following week.",
  })
  // The part with p2 (dumper) stays awaiting the partner.

  // 2) Confirmed order in progress, with an extension to approve and a disputed charge.
  const r2 = S.createRequest(
    store,
    users["u-c1"],
    c1,
    {
      items: [
        { offerId: "o11", qty: 1, accessoryIds: ["a-forks"], transport: true, operator: false },
      ],
      from: d(-10),
      to: d(4),
      siteId: "s2",
      source: "direct",
      jobDescription: "Moving pallets of blocks and panels to build the new warehouse.",
      needs: { accessWidth: "No limit", ground: "Compacted hardcore", schedule: "", notes: "" },
    },
    true
  )
  let q2 = quoteOf(r2, "p1")
  q2 = approve(q2, users["u-p1"], 30)
  const accepted = S.clientAccept(store, users["u-c1"], q2, {
    version: q2.currentVersion,
    acceptTerms: true,
  })
  const r2Doc = store.get<RentalRequest>("requests", r2.id)!
  backdate(r2Doc, -14)
  store.put("requests", r2Doc)
  backdate(accepted.quote, -13)
  store.put("quotes", accepted.quote)
  let o1 = S.partnerSetStatus(store, users["u-p1"], accepted.order, "in_progress")
  backdate(o1, -10)
  o1.createdAt = timestampAt(-12)
  store.put("orders", o1)
  o1 = S.partnerProposeChange(store, users["u-p1"], o1, {
    kind: "extension",
    reason: "Phone request from the site manager: fitting the panels needs one more week.",
    newTo: d(11),
    description: "Extension of the Manitou MT 1440 rental (7 days)",
    qty: 1,
    unit: "week",
    unitPrice: 850,
  })
  o1 = S.partnerAddCharge(
    store,
    users["u-p1"],
    o1,
    {
      kind: "cleaning",
      description:
        "Extra cleaning of the machine at the interim handover: cab and booms with mortar residue.",
      amount: 180,
    },
    []
  )
  S.clientDecideCharge(store, users["u-c1"], o1, o1.charges[o1.charges.length - 1], "dispute", {
    note: "The machine was already dirty on delivery: we have photos from the delivery day. Please cancel the charge.",
  })

  // 3) Expired quote (scissor lift).
  const r3 = S.createRequest(store, users["u-c1"], c1, {
    items: [{ offerId: "o14", qty: 2, transport: true }],
    from: d(12),
    to: d(16),
    siteId: "s1",
    source: "direct",
    jobDescription: "Replacing the light fittings in the portico.",
    needs: {},
  })
  approve(quoteOf(r3, "p2"), users["u-p2"], 1)
  const q3 = quoteOf(r3, "p2")
  q3.versions[q3.versions.length - 1].validUntil = d(-2)
  backdate(q3, -6)
  store.put("quotes", q3)
  S.refreshQuote(store, q3)

  // 4) Completed order with an uploaded invoice and confirmed payment.
  const r4 = S.createRequest(
    store,
    users["u-c1"],
    c1,
    {
      items: [
        { offerId: "o7", qty: 1, accessoryIds: ["a-auger"], transport: true, operator: false },
      ],
      from: d(-40),
      to: d(-33),
      siteId: "s3",
      source: "direct",
      jobDescription: "Holes for the fence posts and levelling the ground.",
      needs: {},
    },
    true
  )
  let q4 = quoteOf(r4, "p3")
  q4 = approve(q4, users["u-p3"], 10)
  const acc4 = S.clientAccept(store, users["u-c1"], q4, {
    version: q4.currentVersion,
    acceptTerms: true,
  })
  let o2 = S.partnerSetStatus(store, users["u-p3"], acc4.order, "in_progress")
  o2 = S.partnerSetStatus(store, users["u-p3"], o2, "completed")
  const summary = S.orderSummary(o2)
  const fid = "f-demo-inv-118"
  const meta = store.putFile(
    fid,
    {
      name: "demo-invoice-118-2026.pdf",
      mime: "application/pdf",
      orderId: o2.id,
      clientId: "c1",
      partnerId: "p3",
      public: false,
    },
    tinyPdf("Canavese Rent (demo) - Invoice no. 118/2026 - FICTITIOUS SAMPLE DOCUMENT")
  )
  o2 = S.partnerUploadInvoice(
    store,
    users["u-p3"],
    o2,
    {
      number: "118/2026",
      date: d(-32),
      amount: summary.agreedGross,
      docType: "invoice",
      note: "Payment 30 days from invoice date",
    },
    fid,
    meta.name
  )
  o2 = S.clientDeclarePayment(store, users["u-c1"], o2, {
    amount: summary.agreedGross,
    date: d(-5),
    method: "Bank transfer",
  })
  S.partnerConfirmPayment(store, users["u-p3"], o2, { amount: summary.agreedGross, date: d(-4) })
  for (const [coll, id, off] of [
    ["requests", r4.id, -45],
    ["quotes", q4.id, -44],
    ["orders", o2.id, -41],
  ] as const) {
    const doc = store.get<{ id: string; createdAt: string; history: { at: string }[] }>(coll, id)!
    backdate(doc, off)
    doc.createdAt = timestampAt(off)
    store.put(coll, doc)
  }

  // 5) Quote rejected by the customer.
  const r5 = S.createRequest(store, users["u-c1"], c1, {
    items: [{ offerId: "o2", qty: 1, transport: true, operator: true }],
    from: d(20),
    to: d(22),
    siteId: "s3",
    source: "direct",
    jobDescription: "Digging for a sewer connection.",
    needs: {},
  })
  approve(quoteOf(r5, "p2"), users["u-p2"], 7)
  S.clientReject(store, users["u-c1"], quoteOf(r5, "p2"), {
    reason: "We found an in-house operator; we'll send the request again without an operator.",
  })

  // 6) Another customer's request (data separation): only c2 and partner p1 can see it.
  S.createRequest(store, users["u-c2"], c2, {
    items: [{ offerId: "o16", qty: 1, transport: true }],
    from: d(3),
    to: d(7),
    siteId: "s4",
    source: "direct",
    jobDescription: "Gutter maintenance on the warehouse.",
    needs: { ground: "Asphalt yard" },
  })
}
