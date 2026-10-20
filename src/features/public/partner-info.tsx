"use client"

import { ArrowRight, FileText, Inbox, Truck } from "lucide-react"
import Link from "next/link"

import { MachinePhoto } from "@/components/app/model-image"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useFormat, useMessages } from "@/i18n/client"
import { defineMessages } from "@/i18n/messages"
import { useMeta } from "@/lib/machina/hooks"
import { cn } from "@/lib/utils"

const POINT_ICONS = [Truck, Inbox, FileText]

const M = defineMessages({
  en: {
    kicker: "For rental companies",
    title: "List your equipment on Machina Rent",
    intro:
      "For construction equipment rental companies in Turin and Piedmont. Publish your machines, receive requests that already include site, period and needs, and keep full control of availability, quotes and invoicing.",
    register: "Register as a rental company",
    photoAlt: "A wheel loader on a construction site",
    points: [
      {
        title: "Your catalogue",
        body: "Add machines by hand or import a CSV file with a preview and error checks. You can attach your PDF catalogue (no automatic data extraction).",
      },
      {
        title: "Structured requests",
        body: "Receive only the lines that concern your machines. Check availability, adjust prices, then approve or decline. Quotes have an expiry date and tracked versions.",
      },
      {
        title: "Orders and documents",
        body: "Extensions, accessories and charges always need the customer's approval. Machina drafts the invoice; you issue it with your own software and upload it.",
      },
    ],
    gettingStarted: "Getting started",
    fourSteps: "Live in four steps",
    steps: [
      "Register your company and the provinces you serve",
      "Add your machines with prices and conditions",
      "Receive requests, confirm availability and send quotes",
      "Manage orders, changes and invoices in one place",
    ],
    plans: "Plans",
    businessModel: "Business model",
    assumption: "Assumption",
    hypothesisNote: null as string | null,
    whoPays:
      "The customer pays the rental company directly; Machina invoices the partner for commission and subscription.",
    planDescriptions: {} as Record<string, string>,
    lowerCommission: "Lower commission",
    perMonth: "/ month",
    commission: "commission on confirmed orders",
    integrations: "Integrations",
    integrationsBody:
      "There is no direct connection to rental companies' management software yet: API integration is a future step.",
  },
  it: {
    kicker: "Per i noleggiatori",
    title: "Pubblica le tue macchine su Machina Rent",
    intro:
      "Per le aziende di noleggio di macchine edili di Torino e del Piemonte. Pubblica le tue macchine, ricevi richieste che includono già cantiere, periodo ed esigenze, e mantieni il pieno controllo di disponibilità, preventivi e fatturazione.",
    register: "Registrati come noleggiatore",
    photoAlt: "Una pala gommata in cantiere",
    points: [
      {
        title: "Il tuo catalogo",
        body: "Aggiungi le macchine a mano o importa un file CSV con anteprima e controllo degli errori. Puoi allegare il tuo catalogo PDF (senza estrazione automatica dei dati).",
      },
      {
        title: "Richieste strutturate",
        body: "Ricevi solo le righe che riguardano le tue macchine. Verifica la disponibilità, adegua i prezzi, poi approva o rifiuta. I preventivi hanno una scadenza e versioni tracciate.",
      },
      {
        title: "Ordini e documenti",
        body: "Proroghe, accessori e addebiti richiedono sempre l'approvazione del cliente. Machina prepara la bozza di fattura; tu la emetti con il tuo gestionale e la carichi.",
      },
    ],
    gettingStarted: "Per iniziare",
    fourSteps: "Operativi in quattro passi",
    steps: [
      "Registra la tua azienda e le province che servi",
      "Aggiungi le tue macchine con prezzi e condizioni",
      "Ricevi le richieste, conferma la disponibilità e invia i preventivi",
      "Gestisci ordini, modifiche e fatture in un unico posto",
    ],
    plans: "Piani",
    businessModel: "Modello di business",
    assumption: "Ipotesi",
    hypothesisNote:
      "Ipotesi dimostrative: percentuali e canoni non sono decisioni commerciali definitive.",
    whoPays:
      "Il cliente paga direttamente il noleggiatore; Machina fattura al partner commissioni e abbonamento.",
    planDescriptions: {
      base: "Nessun canone mensile, commissione sugli ordini confermati.",
      pro: "Canone mensile, commissione ridotta.",
    } as Record<string, string>,
    lowerCommission: "Commissione ridotta",
    perMonth: "/ mese",
    commission: "di commissione sugli ordini confermati",
    integrations: "Integrazioni",
    integrationsBody:
      "Non c'è ancora un collegamento diretto con i gestionali dei noleggiatori: l'integrazione via API è un passo futuro.",
  },
})

export function PartnerInfoView() {
  const t = useMessages(M)
  const { eur, pct } = useFormat()
  const settings = useMeta().data?.settings
  return (
    <>
      <section className="bg-ink relative mb-12 grid overflow-hidden rounded-2xl text-white lg:grid-cols-[1.1fr_1fr]">
        <div className="relative p-8 sm:p-12">
          <p className="text-primary mb-0 text-[0.95rem] font-semibold">{t.kicker}</p>
          <h1 className="relative mt-3 text-[2.4rem] leading-[1.08] text-white sm:text-[3rem]">
            {t.title}
          </h1>
          <p className="relative max-w-[520px] text-[1.05rem] text-white/70">{t.intro}</p>
          <Link
            href="/register?role=partner"
            className={buttonVariants({
              variant: "primary",
              size: "lg",
              className: "relative mt-4",
            })}
          >
            {t.register} <ArrowRight aria-hidden />
          </Link>
        </div>
        <div className="relative min-h-[260px]">
          <MachinePhoto
            src="/img/wheel_loader.png"
            alt={t.photoAlt}
            sizes="(min-width: 1024px) 560px, 100vw"
            eager
          />
        </div>
      </section>

      <div className="mb-12 grid gap-5 md:grid-cols-3">
        {t.points.map(({ title, body }, i) => {
          const Icon = POINT_ICONS[i]
          return (
            <Card key={title} className="lift">
              <span className="bg-primary text-ink mb-4 inline-flex size-12 items-center justify-center rounded-xl">
                <Icon aria-hidden className="size-5" />
              </span>
              <h3>{title}</h3>
              <p className="text-muted-foreground m-0 text-[0.95rem]">{body}</p>
            </Card>
          )
        })}
      </div>

      <section className="mb-12">
        <div className="eyebrow">{t.gettingStarted}</div>
        <h2 className="mt-2 text-[2rem]">{t.fourSteps}</h2>
        <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {t.steps.map((s, i) => (
            <li
              key={s}
              className="border-border bg-card relative overflow-hidden rounded-xl border p-6"
            >
              <span className="bg-ink text-primary inline-flex size-9 items-center justify-center rounded-full text-[0.9rem] font-bold">
                {i + 1}
              </span>
              <p className="relative m-0 mt-4 font-medium">{s}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <div className="eyebrow">{t.plans}</div>
        <h2 className="mt-2 flex items-center gap-3 text-[2rem]">
          {t.businessModel} <Badge tone="warn">{t.assumption}</Badge>
        </h2>
        <p className="text-muted-foreground max-w-[760px]">
          {t.hypothesisNote ?? settings?.hypothesisNote} {t.whoPays}
        </p>
        <div className="grid gap-5 md:grid-cols-2">
          {settings?.plans.map((p, i) => (
            <Card
              key={p.id}
              className={
                i === 1
                  ? "bg-ink text-ink-foreground relative overflow-hidden border-transparent"
                  : undefined
              }
            >
              <div className="relative flex items-center justify-between gap-2">
                <h3 className={cn("m-0 text-[1.5rem] font-bold", i === 1 && "text-white")}>
                  {p.name}
                </h3>
                {i === 1 && (
                  <span className="bg-primary text-ink rounded-full px-2.5 py-0.5 text-[0.75rem] font-bold">
                    {t.lowerCommission}
                  </span>
                )}
              </div>
              <div className="relative mt-4 flex items-baseline gap-2">
                <span
                  className={cn(
                    "text-[2.8rem] leading-none font-bold tracking-[-0.03em]",
                    i === 1 && "text-white"
                  )}
                >
                  {eur(p.monthly)}
                </span>
                <span className={i === 1 ? "text-ink-foreground/60" : "text-muted-foreground"}>
                  {t.perMonth}
                </span>
              </div>
              <p className="relative mt-3 mb-0 text-[1.02rem]">
                <b className={i === 1 ? "text-primary" : "text-brand"}>{pct(p.commissionRate)}</b>{" "}
                {t.commission}
              </p>
              <p
                className={cn(
                  "relative mt-2 mb-0 text-sm",
                  i === 1 ? "text-ink-foreground/65" : "text-muted-foreground"
                )}
              >
                {t.planDescriptions[p.id] ?? p.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <Alert tone="info" className="mt-8" title={t.integrations}>
        {t.integrationsBody}
      </Alert>
    </>
  )
}
