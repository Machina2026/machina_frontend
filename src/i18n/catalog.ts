import { useLocale } from "./client"
import type { Locale } from "./config"

// Names of the catalogue's reference data. The API sends them in English
// (src/catalog/meta.ts in machina_backend); Italian is looked up here, and
// anything not listed (a new category, say) falls back to the API's text.
// Partner content (descriptions, conditions, accessory names) is shown as written.

const CATEGORIES: Record<string, string> = {
  excavators: "Escavatori e miniescavatori",
  loaders: "Pale gommate e minipale",
  backhoes: "Terne",
  dumpers: "Dumper",
  telehandlers: "Sollevatori telescopici",
  platforms: "Piattaforme di lavoro aeree",
  rollers: "Rulli compattatori",
  cranes: "Autogru",
  generators: "Generatori da cantiere",
}

/** Machine types, keyed by their English name (models store the name). */
const SUBTYPES: Record<string, string> = {
  "Mini excavator": "Miniescavatore",
  "Midi excavator": "Midiescavatore",
  "Crawler excavator": "Escavatore cingolato",
  "Skid steer": "Minipala",
  "Wheel loader": "Pala gommata",
  "Backhoe loader": "Terna",
  "Wheeled dumper": "Dumper gommato",
  "Tracked dumper": "Dumper cingolato",
  "Fixed telehandler": "Sollevatore telescopico fisso",
  "Rotating telehandler": "Sollevatore telescopico rotativo",
  "Scissor lift": "Piattaforma a pantografo",
  "Articulating boom": "Piattaforma articolata",
  "Telescopic boom": "Piattaforma telescopica",
  "Tandem roller": "Rullo tandem",
  "Single drum roller": "Rullo monotamburo",
  "Mobile crane": "Autogru",
  "Diesel generator": "Generatore diesel",
}

/** Spec sheet labels, keyed by their English label (one key can have several labels). */
const SPECS: Record<string, string> = {
  "Operating weight": "Peso operativo",
  "Overall width": "Larghezza totale",
  "Max digging depth": "Profondità di scavo max",
  "Max reach at ground level": "Sbraccio max a terra",
  "Engine power": "Potenza motore",
  "Tail swing": "Ingombro posteriore",
  "Rated operating capacity": "Carico operativo nominale",
  "Bucket capacity": "Capacità benna",
  "Dump height": "Altezza di scarico",
  "Front bucket capacity": "Capacità benna anteriore",
  Payload: "Portata",
  "Empty weight": "Peso a vuoto",
  "Skip discharge": "Scarico cassone",
  Drive: "Trazione",
  "Max capacity": "Portata max",
  "Lift height": "Altezza di sollevamento",
  "Max reach": "Sbraccio max",
  Rotation: "Rotazione",
  "Working height": "Altezza di lavoro",
  "Working outreach": "Sbraccio di lavoro",
  "Platform capacity": "Portata piattaforma",
  Weight: "Peso",
  Power: "Alimentazione",
  "Drum width": "Larghezza tamburo",
  Type: "Tipo",
  "Max capacity (at minimum radius)": "Portata max (al raggio minimo)",
  "Telescopic boom length": "Lunghezza braccio telescopico",
  Axles: "Assi",
  "Road travel weight": "Peso in assetto stradale",
  "Prime power": "Potenza continua",
  "Dimensions (L×W×H)": "Dimensioni (L×P×H)",
  Fuel: "Alimentazione",
  Soundproofed: "Insonorizzato",
  // Catalogue filters.
  "Max width (mm)": "Larghezza max (mm)",
  "Max weight (kg)": "Peso max (kg)",
  "Min digging depth (m)": "Profondità di scavo min (m)",
  "Min working/lift height (m)": "Altezza di lavoro/sollevamento min (m)",
  "Min capacity (kg)": "Portata min (kg)",
  "Min power (kVA)": "Potenza min (kVA)",
}

const PROVINCES: Record<string, string> = { TO: "Torino" }

const ACCESSORY_GROUPS: Record<string, string> = {
  Demolition: "Demolizione",
  Digging: "Scavo",
  Drilling: "Perforazione",
  Lifting: "Sollevamento",
  Power: "Energia",
}

function catalogText(locale: Locale) {
  const it = locale === "it"
  const pick = (table: Record<string, string>, key: string, fallback: string) =>
    it ? (table[key] ?? fallback) : fallback
  return {
    category: (id: string, name: string) => pick(CATEGORIES, id, name),
    subtype: (name: string) => pick(SUBTYPES, name, name),
    spec: (label: string) => pick(SPECS, label, label),
    province: (id: string, name: string) => pick(PROVINCES, id, name),
    accessoryGroup: (name: string) => pick(ACCESSORY_GROUPS, name, name),
  }
}

export type CatalogText = ReturnType<typeof catalogText>

const BY_LOCALE: Record<Locale, CatalogText> = { it: catalogText("it"), en: catalogText("en") }

/** Category, machine type, spec and province names in the current language. */
export function useCatalogText(): CatalogText {
  return BY_LOCALE[useLocale()]
}
