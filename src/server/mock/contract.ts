import { createHash } from "node:crypto"

import type {
  ContractClause,
  ContractParty as Party,
  ContractTerms,
  Quote,
  QuoteVersion,
} from "@/lib/machina/types"

import { addDays } from "./dates"

type Company = {
  name: string
  vat: string
  address: string
  city: string
  province: string
  email: string
  pec?: string
}

// Copy of machina_backend src/rentals/contract.ts, for running without the API.
// The rental contract the customer signs when accepting a quote. Its clauses
// are written here in each language the web app speaks; the signed copy keeps
// both, with a fingerprint of the exact terms, so later wording changes never
// touch contracts already signed. Changing the clauses: bump TEMPLATE.
//
// The wording is a starting point, not legal advice: have it reviewed before
// relying on it.

export const CONTRACT_TEMPLATE = "machina-rental-2026-11"
/** Days the customer has to pay, from signing (or from accepting a change or charge). */
export const PAYMENT_DAYS = 30

export const partyOf = (c: Company): Party => ({
  name: c.name,
  vat: c.vat,
  address: c.address,
  city: c.city,
  province: c.province,
  email: c.email,
  pec: c.pec ?? "",
})

type Values = {
  lessor: string
  customer: string
  quote: string
  site: string
  from: string
  to: string
  net: string
  gross: string
  vat: number
  days: number
  due: string
}

const money = (locale: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" })
const day = (locale: string, iso: string) =>
  new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`))

function values(locale: string, t: Omit<ContractTerms, "clauses">): Values {
  const eur = money(locale)
  return {
    lessor: t.lessor.name,
    customer: t.customer.name,
    quote: `${t.quoteCode} v${t.version}`,
    site: [t.site.address, t.site.city, t.site.province].filter(Boolean).join(", "),
    from: day(locale, t.period.from),
    to: day(locale, t.period.to),
    net: eur.format(t.totals.net),
    gross: eur.format(t.totals.gross),
    vat: t.totals.vatRate,
    days: t.paymentDays,
    due: day(locale, t.paymentDue),
  }
}

const EN = (v: Values): ContractClause[] => [
  {
    title: "Subject",
    body: `${v.lessor} (the Lessor) rents to ${v.customer} (the Customer) the machines and services listed in this contract, as described in quote ${v.quote}, for use at ${v.site} from ${v.from} to ${v.to}.`,
  },
  {
    title: "Machina's role",
    body: "Machina runs the platform on which this contract is made and collects the Customer's payments on the Lessor's behalf. Machina is not a party to the rental: the Lessor is responsible for the machines and services it supplies, the Customer for their use.",
  },
  {
    title: "Price",
    body: `The agreed price is ${v.net} plus VAT (${v.gross} including VAT at ${v.vat}%). It is locked: only a change the Customer accepts in Machina alters it. Delivery, collection, operators and accessories are included only where listed.`,
  },
  {
    title: "Payment",
    body: `The Customer pays through Machina, using the payment request Machina sends, within ${v.days} days of signing this contract (by ${v.due}). Each accepted change or extra charge is billed separately and is due ${v.days} days after the Customer accepts it. Payment to Machina settles the Customer's debt to the Lessor. The Lessor issues the tax invoices.`,
  },
  {
    title: "Delivery and handover report",
    body: "At delivery the Lessor records a handover report in Machina with each machine's hour meter, fuel level, condition and photos, and signs it. The Customer countersigns it in Machina, noting any defect or difference as a remark. The report is the reference for the machines' condition at the start of the rental.",
  },
  {
    title: "Use and custody",
    body: "From delivery to collection the Customer has custody of the machines and is responsible for them. The Customer uses them only at the site above, for their intended purpose and following the manufacturer’s instructions, with trained and authorised operators unless the Lessor supplies the operator, and does not sublet or lend them.",
  },
  {
    title: "Return and return report",
    body: "At the end of the rental the Customer makes the machines available for collection, clean and with the fuel level recorded at delivery. The Lessor records a return report with the same readings and signs it; the Customer countersigns it, with remarks if needed. Normal wear is not damage.",
  },
  {
    title: "Extra charges",
    body: "The Lessor may charge for damage beyond normal wear, missing fuel and extra cleaning through Machina, with a description, an amount and evidence. The Customer accepts or disputes each charge in Machina; only accepted charges are billed. Disputed charges are settled between the parties.",
  },
  {
    title: "Changes and extensions",
    body: "Extensions, extra accessories and services are agreed in Machina and apply only once the Customer accepts the price the Lessor proposes.",
  },
  {
    title: "Late payment",
    body: "Amounts not paid when due bear statutory late-payment interest (Italian Legislative Decree 231/2002).",
  },
  {
    title: "Electronic signature",
    body: "The Lessor's offer is the quote it sent through Machina. The Customer accepts it by signing in Machina: typing their name and confirming. Machina records the name typed, the account used, the date and time, the IP address and a fingerprint of the terms signed. The parties agree that this simple electronic signature binds them.",
  },
]

const IT = (v: Values): ContractClause[] => [
  {
    title: "Oggetto",
    body: `${v.lessor} (il Locatore) concede a noleggio a ${v.customer} (il Cliente) le macchine e i servizi elencati in questo contratto, come descritti nel preventivo ${v.quote}, per l'uso presso ${v.site} dal ${v.from} al ${v.to}.`,
  },
  {
    title: "Ruolo di Machina",
    body: "Machina gestisce la piattaforma su cui è concluso questo contratto e incassa i pagamenti del Cliente per conto del Locatore. Machina non è parte del noleggio: il Locatore risponde delle macchine e dei servizi che fornisce, il Cliente del loro uso.",
  },
  {
    title: "Prezzo",
    body: `Il prezzo concordato è di ${v.net} più IVA (${v.gross} IVA ${v.vat}% inclusa). È bloccato: lo modifica solo una variazione accettata dal Cliente su Machina. Consegna, ritiro, operatori e accessori sono inclusi solo se elencati.`,
  },
  {
    title: "Pagamento",
    body: `Il Cliente paga tramite Machina, con la richiesta di pagamento inviata da Machina, entro ${v.days} giorni dalla firma di questo contratto (entro il ${v.due}). Ogni variazione o addebito extra accettato è fatturato a parte ed è dovuto ${v.days} giorni dopo l'accettazione del Cliente. Il pagamento a Machina estingue il debito del Cliente verso il Locatore. Le fatture fiscali sono emesse dal Locatore.`,
  },
  {
    title: "Consegna e verbale di consegna",
    body: "Alla consegna il Locatore registra su Machina un verbale con contaore, livello di carburante, stato e foto di ogni macchina, e lo firma. Il Cliente lo controfirma su Machina, annotando come osservazione eventuali difetti o differenze. Il verbale è il riferimento per lo stato delle macchine all’inizio del noleggio.",
  },
  {
    title: "Uso e custodia",
    body: "Dalla consegna al ritiro il Cliente ha la custodia delle macchine e ne è responsabile. Il Cliente le usa solo nel cantiere indicato, per l'uso a cui sono destinate e secondo le istruzioni del costruttore, con operatori formati e abilitati salvo che l'operatore sia fornito dal Locatore, e non le subloca né le presta.",
  },
  {
    title: "Riconsegna e verbale di riconsegna",
    body: "Al termine del noleggio il Cliente rende disponibili le macchine per il ritiro, pulite e con il livello di carburante registrato alla consegna. Il Locatore registra un verbale di riconsegna con le stesse letture e lo firma; il Cliente lo controfirma, con osservazioni se necessario. L'usura normale non è un danno.",
  },
  {
    title: "Addebiti extra",
    body: "Il Locatore può addebitare tramite Machina danni oltre l'usura normale, carburante mancante e pulizia straordinaria, con descrizione, importo e documentazione. Il Cliente accetta o contesta ogni addebito su Machina; sono fatturati solo gli addebiti accettati. Gli addebiti contestati sono definiti tra le parti.",
  },
  {
    title: "Variazioni e proroghe",
    body: "Proroghe, accessori e servizi aggiuntivi sono concordati su Machina e valgono solo dopo che il Cliente ha accettato il prezzo proposto dal Locatore.",
  },
  {
    title: "Ritardo nei pagamenti",
    body: "Sulle somme non pagate alla scadenza decorrono gli interessi di mora previsti dal D.Lgs. 231/2002.",
  },
  {
    title: "Firma elettronica",
    body: "L'offerta del Locatore è il preventivo inviato tramite Machina. Il Cliente la accetta firmando su Machina: digitando il proprio nome e confermando. Machina registra il nome digitato, l'account usato, data e ora, l'indirizzo IP e un'impronta dei termini firmati. Le parti riconoscono che questa firma elettronica semplice le vincola.",
  },
]

/** The contract for a quote version, as the customer would sign it on `signDay`. */
export function contractTerms(
  q: Quote,
  v: QuoteVersion,
  lessor: Party,
  customer: Party,
  signDay: string
): ContractTerms {
  const base = {
    template: CONTRACT_TEMPLATE,
    lessor,
    customer,
    quoteCode: q.code,
    version: v.n,
    offeredBy: v.author,
    offeredAt: v.createdAt,
    period: q.period,
    site: q.site,
    items: q.items.map((it) => ({ label: it.label, qty: it.qty })),
    lines: v.lines,
    totals: v.totals,
    paymentDays: PAYMENT_DAYS,
    paymentDue: addDays(signDay, PAYMENT_DAYS),
  }
  return {
    ...base,
    clauses: {
      en: EN(values("en-GB", base)),
      it: IT(values("it-IT", base)),
    },
  }
}

/** JSON with sorted keys: the database may store keys in another order. */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`
  if (v && typeof v === "object")
    return `{${Object.keys(v)
      .sort()
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
      .join(",")}}`
  return JSON.stringify(v)
}

/** SHA-256 of the terms, so anyone can check a stored contract wasn't altered. */
export const termsHash = (t: ContractTerms) =>
  createHash("sha256").update(canonical(t)).digest("hex")
