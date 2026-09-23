import type { Category, Province, SpecField, SpecFilter } from "@/lib/machina/types"

// Catalogue metadata: categories, spec sheets per category, served provinces.

export const CATEGORIES: Category[] = [
  {
    id: "excavators",
    name: "Excavators and mini excavators",
    subtypes: ["Mini excavator", "Midi excavator", "Crawler excavator"],
    image: "/img/cat-excavators.svg",
  },
  {
    id: "loaders",
    name: "Wheel loaders and skid steers",
    subtypes: ["Skid steer", "Wheel loader"],
    image: "/img/cat-loaders.svg",
  },
  {
    id: "backhoes",
    name: "Backhoe loaders",
    subtypes: ["Backhoe loader"],
    image: "/img/cat-backhoes.svg",
  },
  {
    id: "dumpers",
    name: "Dumpers",
    subtypes: ["Wheeled dumper", "Tracked dumper"],
    image: "/img/cat-dumpers.svg",
  },
  {
    id: "telehandlers",
    name: "Telehandlers",
    subtypes: ["Fixed telehandler", "Rotating telehandler"],
    image: "/img/cat-telehandlers.svg",
  },
  {
    id: "platforms",
    name: "Aerial work platforms",
    subtypes: ["Scissor lift", "Articulating boom", "Telescopic boom"],
    image: "/img/cat-platforms.svg",
  },
  {
    id: "rollers",
    name: "Compaction rollers",
    subtypes: ["Tandem roller", "Single drum roller"],
    image: "/img/cat-rollers.svg",
  },
  { id: "cranes", name: "Mobile cranes", subtypes: ["Mobile crane"], image: "/img/cat-cranes.svg" },
  {
    id: "generators",
    name: "Site generators",
    subtypes: ["Diesel generator"],
    image: "/img/cat-generators.svg",
  },
]

const f = (key: string, label: string, unit: string, type: "num" | "text" = "num"): SpecField => ({
  key,
  label,
  unit,
  type,
})

export const SPEC_SCHEMA: Record<string, SpecField[]> = {
  excavators: [
    f("weight_kg", "Operating weight", "kg"),
    f("width_mm", "Overall width", "mm"),
    f("dig_depth_m", "Max digging depth", "m"),
    f("reach_m", "Max reach at ground level", "m"),
    f("power_kw", "Engine power", "kW"),
    f("rotation", "Tail swing", "", "text"),
  ],
  loaders: [
    f("weight_kg", "Operating weight", "kg"),
    f("width_mm", "Overall width", "mm"),
    f("load_kg", "Rated operating capacity", "kg"),
    f("bucket_m3", "Bucket capacity", "m³"),
    f("height_m", "Dump height", "m"),
    f("power_kw", "Engine power", "kW"),
  ],
  backhoes: [
    f("weight_kg", "Operating weight", "kg"),
    f("width_mm", "Overall width", "mm"),
    f("dig_depth_m", "Max digging depth", "m"),
    f("bucket_m3", "Front bucket capacity", "m³"),
    f("power_kw", "Engine power", "kW"),
  ],
  dumpers: [
    f("load_kg", "Payload", "kg"),
    f("weight_kg", "Empty weight", "kg"),
    f("width_mm", "Overall width", "mm"),
    f("power_kw", "Engine power", "kW"),
    f("dump", "Skip discharge", "", "text"),
    f("drive", "Drive", "", "text"),
  ],
  telehandlers: [
    f("load_kg", "Max capacity", "kg"),
    f("height_m", "Lift height", "m"),
    f("reach_m", "Max reach", "m"),
    f("weight_kg", "Operating weight", "kg"),
    f("width_mm", "Overall width", "mm"),
    f("rotation", "Rotation", "", "text"),
  ],
  platforms: [
    f("height_m", "Working height", "m"),
    f("reach_m", "Working outreach", "m"),
    f("load_kg", "Platform capacity", "kg"),
    f("width_mm", "Overall width", "mm"),
    f("weight_kg", "Weight", "kg"),
    f("power_source", "Power", "", "text"),
  ],
  rollers: [
    f("weight_kg", "Operating weight", "kg"),
    f("width_mm", "Drum width", "mm"),
    f("power_kw", "Engine power", "kW"),
    f("type", "Type", "", "text"),
  ],
  cranes: [
    f("capacity_t", "Max capacity (at minimum radius)", "t"),
    f("height_m", "Telescopic boom length", "m"),
    f("axles", "Axles", ""),
    f("weight_kg", "Road travel weight", "kg"),
  ],
  generators: [
    f("power_kva", "Prime power", "kVA"),
    f("weight_kg", "Weight", "kg"),
    f("dimensions", "Dimensions (L×W×H)", "", "text"),
    f("power_source", "Fuel", "", "text"),
    f("soundproofed", "Soundproofed", "", "text"),
  ],
}

/** "Features" filters in the catalogue: spec key and whether the value is a maximum or minimum. */
export const SPEC_FILTERS: SpecFilter[] = [
  { key: "width_mm", label: "Max width (mm)", op: "max" },
  { key: "weight_kg", label: "Max weight (kg)", op: "max" },
  { key: "dig_depth_m", label: "Min digging depth (m)", op: "min" },
  { key: "height_m", label: "Min working/lift height (m)", op: "min" },
  { key: "load_kg", label: "Min capacity (kg)", op: "min" },
  { key: "power_kva", label: "Min power (kVA)", op: "min" },
]

export const PROVINCES: Province[] = [
  { id: "TO", name: "Turin" },
  { id: "CN", name: "Cuneo" },
  { id: "AT", name: "Asti" },
  { id: "AL", name: "Alessandria" },
  { id: "BI", name: "Biella" },
  { id: "NO", name: "Novara" },
  { id: "VC", name: "Vercelli" },
  { id: "VB", name: "Verbano-Cusio-Ossola" },
]
export const PROVINCE_IDS = PROVINCES.map((p) => p.id)

/** Main towns, used by the assistant to find the site's province. */
export const TOWNS: Record<string, string> = {
  turin: "TO",
  torino: "TO",
  moncalieri: "TO",
  rivoli: "TO",
  collegno: "TO",
  grugliasco: "TO",
  "settimo torinese": "TO",
  chieri: "TO",
  pinerolo: "TO",
  ivrea: "TO",
  chivasso: "TO",
  orbassano: "TO",
  nichelino: "TO",
  venaria: "TO",
  carmagnola: "TO",
  avigliana: "TO",
  susa: "TO",
  ciriè: "TO",
  cirie: "TO",
  beinasco: "TO",
  rivalta: "TO",
  "san mauro": "TO",
  cuneo: "CN",
  alba: "CN",
  bra: "CN",
  fossano: "CN",
  savigliano: "CN",
  mondovì: "CN",
  mondovi: "CN",
  saluzzo: "CN",
  asti: "AT",
  alessandria: "AL",
  "casale monferrato": "AL",
  "novi ligure": "AL",
  tortona: "AL",
  novara: "NO",
  vercelli: "VC",
  biella: "BI",
  verbania: "VB",
  domodossola: "VB",
}

export const VAT_RATE = 22
