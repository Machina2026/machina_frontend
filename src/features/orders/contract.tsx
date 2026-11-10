"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"

import { KV, Small } from "@/components/app/bits"
import { LinesTable } from "@/components/app/lines-table"
import { QueryView } from "@/components/app/query-view"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Check, Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useFormat, useLocale, useMessages } from "@/i18n/client"
import { defineMessages } from "@/i18n/messages"
import { api } from "@/lib/machina/api"
import type { ContractParty, ContractTerms, OrderView, Role, Signature } from "@/lib/machina/types"

const M = defineMessages({
  en: {
    title: "Rental contract",
    lessor: "Lessor (rental company)",
    customer: "Customer",
    vat: "VAT",
    quote: "Quote",
    period: "Period",
    site: "Site",
    machines: "Machines",
    payment: "Payment",
    paymentTerms: (days: number, due: string) =>
      `Through Machina within ${days} days of signing (by ${due})`,
    price: "Price",
    plusVat: "+ VAT",
    signatures: "Signatures",
    offer: "Lessor's offer",
    offerBy: (by: string, at: string) => `Quote sent by ${by} on ${at}`,
    signedBy: "Signed by the customer",
    signedAs: (name: string, user: string, at: string) => `"${name}" (account: ${user}) on ${at}`,
    ip: (ip: string) => `From IP address ${ip || "not recorded"}`,
    fingerprint: "Fingerprint of the terms (SHA-256)",
    back: (code: string) => `← Back to order ${code}`,
    print: "Print or save as PDF",
    noContract:
      "This order was confirmed before contracts were signed in Machina: its terms are the accepted quote.",
    typeName: "Type your full name to sign",
    typeNameHint: "Your name, the account, the time and your IP address are recorded.",
  },
  it: {
    title: "Contratto di noleggio",
    lessor: "Locatore (noleggiatore)",
    customer: "Cliente",
    vat: "P. IVA",
    quote: "Preventivo",
    period: "Periodo",
    site: "Cantiere",
    machines: "Macchine",
    payment: "Pagamento",
    paymentTerms: (days: number, due: string) =>
      `Tramite Machina entro ${days} giorni dalla firma (entro il ${due})`,
    price: "Prezzo",
    plusVat: "+ IVA",
    signatures: "Firme",
    offer: "Offerta del locatore",
    offerBy: (by: string, at: string) => `Preventivo inviato da ${by} il ${at}`,
    signedBy: "Firmato dal cliente",
    signedAs: (name: string, user: string, at: string) => `"${name}" (account: ${user}) il ${at}`,
    ip: (ip: string) => `Dall'indirizzo IP ${ip || "non registrato"}`,
    fingerprint: "Impronta dei termini (SHA-256)",
    back: (code: string) => `← Torna all'ordine ${code}`,
    print: "Stampa o salva in PDF",
    noContract:
      "Questo ordine è stato confermato prima che i contratti si firmassero su Machina: i suoi termini sono il preventivo accettato.",
    typeName: "Digita nome e cognome per firmare",
    typeNameHint: "Vengono registrati il tuo nome, l'account, l'ora e il tuo indirizzo IP.",
  },
})

function Party({ title, p }: { title: string; p: ContractParty }) {
  const t = useMessages(M)
  return (
    <div>
      <div className="text-muted-foreground mb-1.5 text-[0.78rem] font-bold tracking-wide uppercase">
        {title}
      </div>
      <b>{p.name}</b>
      <br />
      {t.vat} {p.vat || "—"}
      <br />
      {p.address}, {p.city} ({p.province})
      {p.pec && (
        <>
          <br />
          PEC {p.pec}
        </>
      )}
    </div>
  )
}

/** The contract's terms and clauses in the current language, and the signatures once signed. */
export function ContractDocument({
  terms,
  signature,
  hash,
  compact,
}: {
  terms: ContractTerms
  signature?: Signature
  hash?: string
  /** In a dialog: no parties' details, no lines. */
  compact?: boolean
}) {
  const t = useMessages(M)
  const locale = useLocale()
  const { date, dateTime, eur } = useFormat()
  const clauses = terms.clauses[locale] ?? terms.clauses.en
  const site = [terms.site.address, terms.site.city, terms.site.province].filter(Boolean).join(", ")
  return (
    <div className="text-[0.92rem]">
      {!compact && (
        <div className="mb-4 grid gap-6 sm:grid-cols-2">
          <Party title={t.lessor} p={terms.lessor} />
          <Party title={t.customer} p={terms.customer} />
        </div>
      )}
      <KV
        className="mb-3"
        items={[
          [t.quote, `${terms.quoteCode} v${terms.version}`],
          [t.period, `${date(terms.period.from)} → ${date(terms.period.to)}`],
          [t.site, site],
          [
            t.machines,
            terms.items.map((i) => (i.qty > 1 ? `${i.label} ×${i.qty}` : i.label)).join(", "),
          ],
          [t.price, `${eur(terms.totals.net)} ${t.plusVat} · ${eur(terms.totals.gross)}`],
          [t.payment, t.paymentTerms(terms.paymentDays, date(terms.paymentDue))],
        ]}
      />
      {!compact && (
        <div className="mb-4">
          <LinesTable lines={terms.lines} totals={terms.totals} />
        </div>
      )}
      <ol className="m-0 list-decimal space-y-2.5 pl-5">
        {clauses.map((c) => (
          <li key={c.title}>
            <b>{c.title}.</b> {c.body}
          </li>
        ))}
      </ol>
      {signature && (
        <div className="mt-5 border-t pt-4">
          <h3>{t.signatures}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="font-semibold">{t.offer}</div>
              <Small>{t.offerBy(terms.offeredBy, dateTime(terms.offeredAt))}</Small>
            </div>
            <div>
              <div className="font-semibold">{t.signedBy}</div>
              <Small>
                {t.signedAs(signature.name, signature.userName, dateTime(signature.at))}
                <br />
                {t.ip(signature.ip)}
              </Small>
            </div>
          </div>
          {hash && (
            <Small className="text-faint mt-3 break-all">
              {t.fingerprint}: <code>{hash}</code>
            </Small>
          )}
        </div>
      )}
    </div>
  )
}

/** The order's signed contract, printable. */
export function ContractPage({ orderId, role }: { orderId: string; role: Role }) {
  const t = useMessages(M)
  const area = role === "client" ? "/buyer" : "/supplier"
  const base = role === "client" ? "/api/client/orders/" : "/api/partner/orders/"
  const q = useQuery({
    queryKey: ["order", role, orderId],
    queryFn: () => api.get<OrderView>(base + orderId),
  })
  return (
    <QueryView query={q}>
      {(o) => (
        <>
          <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
            <Link href={`${area}/orders/${o.id}`}>{t.back(o.code)}</Link>
            {o.contract && <Button onClick={() => window.print()}>{t.print}</Button>}
          </div>
          <article className="bg-card mx-auto max-w-[860px] rounded-lg border p-6 shadow-sm print:border-0 print:shadow-none">
            <h1 className="mb-1">{t.title}</h1>
            <Small className="mb-5">{o.code}</Small>
            {o.contract ? (
              <ContractDocument
                terms={o.contract}
                signature={o.contract.signature}
                hash={o.contract.hash}
              />
            ) : (
              <Alert>{t.noContract}</Alert>
            )}
          </article>
        </>
      )}
    </QueryView>
  )
}

/** Typed name and tick box: what makes a simple electronic signature. */
export function SignatureFields({
  name,
  onName,
  confirmed,
  onConfirmed,
  confirmLabel,
  fields,
  idPrefix,
}: {
  name: string
  onName: (v: string) => void
  confirmed: boolean
  onConfirmed: (v: boolean) => void
  confirmLabel: React.ReactNode
  fields: Record<string, string>
  idPrefix: string
}) {
  const t = useMessages(M)
  return (
    <>
      <Field label="" error={fields.confirm} className="mb-3">
        <Check
          checked={confirmed}
          onChange={(e) => onConfirmed(e.target.checked)}
          label={confirmLabel}
        />
      </Field>
      <Field
        label={t.typeName}
        htmlFor={`${idPrefix}-sig`}
        error={fields.signatureName}
        hint={t.typeNameHint}
      >
        <Input
          id={`${idPrefix}-sig`}
          value={name}
          autoComplete="name"
          onChange={(e) => onName(e.target.value)}
          className="font-serif text-lg italic"
        />
      </Field>
    </>
  )
}
