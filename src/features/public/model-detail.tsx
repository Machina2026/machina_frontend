"use client"

import { useQuery } from "@tanstack/react-query"
import { ArrowDown, HardHat, MapPin, Plus, Puzzle, Ruler, Scale } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Crumbs, KV, MarkList, Small } from "@/components/app/bits"
import { PanelTitle } from "@/components/app/dashboard"
import { MachinePhoto } from "@/components/app/model-image"
import { QueryView } from "@/components/app/query-view"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check } from "@/components/ui/field"
import { useCatalogText } from "@/i18n/catalog"
import { useFormat, useMessages } from "@/i18n/client"
import { defineMessages, plural } from "@/i18n/messages"
import { api, photoUrl, qs } from "@/lib/machina/api"
import { stripDemo } from "@/lib/machina/format"
import { useMeta } from "@/lib/machina/hooks"
import { useLabels } from "@/lib/machina/labels"
import type { ModelDetail, PublicModel, PublicOffer } from "@/lib/machina/types"

import { AddToDraftDialog } from "./add-to-draft"

const M = defineMessages({
  en: {
    rates: "Rates (excl. VAT)",
    perDay: "/day",
    perWeek: "/week",
    perMonth: "/month",
    minRental: "Minimum rental · hours included",
    days: (n: number) => `${n} ${plural(n, "day", "days")}`,
    hoursPerDay: "h/day",
    overtime: (price: string) => `Overtime ${price}/h billed at cost`,
    transport: "Transport",
    roundTrip: (price: string) => `: ${price} round trip`,
    operator: "Operator",
    deposit: "Deposit",
    none: "None",
    depotArea: "Depot and area served",
    outsideArea: "outside area",
    serves: (prov: string) => `serves ${prov}`,
    accessories: "Accessories",
    included: "included",
    noAccessories: "No accessories listed",
    conditions: "Conditions",
    availability: "Availability to be confirmed by the partner",
    catalog: "Catalogue",
    photoAlt: (cat: string) => `${cat}: illustrative photo`,
    photoNote: "Illustrative photo · not the exact model",
    offersFrom: (n: number) => `${n} ${plural(n, "offer", "offers")} · from`,
    perDayExclVat: "/day excl. VAT",
    seeOffers: "See the offers",
    specifications: "Specifications",
    indicative: "Indicative figures: check the manufacturer's sheet and the rental company.",
    suitableJobs: "Suitable jobs",
    limitations: "Limitations",
    compatibleAccessories: "Compatible accessories",
    noCompatible: "No accessories listed for this model.",
    rentalCompanies: "Rental companies",
    offersTitle: (n: number) => `${n} ${plural(n, "offer", "offers")} for this machine`,
    selectTwo: "Select at least two offers",
    compareSelected: "Compare selected offers",
    pricesNote: "Prices excluding VAT. Availability is always to be confirmed by the partner.",
    lowest: "Lowest daily rate",
    verifying: "Partner being verified",
    depot: (city: string, prov: string) => `Depot: ${city} (${prov})`,
    compare: "Compare",
    addToRequest: "Add to request",
    partnerPhoto: "Partner's photo",
  },
  it: {
    rates: "Tariffe (IVA esclusa)",
    perDay: "/giorno",
    perWeek: "/settimana",
    perMonth: "/mese",
    minRental: "Noleggio minimo · ore incluse",
    days: (n: number) => `${n} ${plural(n, "giorno", "giorni")}`,
    hoursPerDay: "h/giorno",
    overtime: (price: string) => `Ore extra ${price}/h a consuntivo`,
    transport: "Trasporto",
    roundTrip: (price: string) => `: ${price} andata e ritorno`,
    operator: "Operatore",
    deposit: "Cauzione",
    none: "Nessuna",
    depotArea: "Deposito e zona servita",
    outsideArea: "fuori zona",
    serves: (prov: string) => `serve ${prov}`,
    accessories: "Accessori",
    included: "incluso",
    noAccessories: "Nessun accessorio indicato",
    conditions: "Condizioni",
    availability: "Disponibilità da confermare dal noleggiatore",
    catalog: "Catalogo",
    photoAlt: (cat: string) => `${cat}: foto illustrativa`,
    photoNote: "Foto illustrativa · non è il modello esatto",
    offersFrom: (n: number) => `${n} ${plural(n, "offerta", "offerte")} · da`,
    perDayExclVat: "/giorno IVA esclusa",
    seeOffers: "Vedi le offerte",
    specifications: "Scheda tecnica",
    indicative: "Valori indicativi: verifica la scheda del costruttore e il noleggiatore.",
    suitableJobs: "Lavori adatti",
    limitations: "Limiti",
    compatibleAccessories: "Accessori compatibili",
    noCompatible: "Nessun accessorio indicato per questo modello.",
    rentalCompanies: "Noleggiatori",
    offersTitle: (n: number) => `${n} ${plural(n, "offerta", "offerte")} per questa macchina`,
    selectTwo: "Seleziona almeno due offerte",
    compareSelected: "Confronta le offerte selezionate",
    pricesNote: "Prezzi IVA esclusa. La disponibilità va sempre confermata dal noleggiatore.",
    lowest: "Tariffa giornaliera più bassa",
    verifying: "Noleggiatore in verifica",
    depot: (city: string, prov: string) => `Deposito: ${city} (${prov})`,
    compare: "Confronta",
    addToRequest: "Aggiungi alla richiesta",
    partnerPhoto: "Foto del noleggiatore",
  },
})

function OfferDetails({ o, prov }: { o: PublicOffer; prov: string }) {
  const t = useMessages(M)
  const L = useLabels()
  const { eur, num } = useFormat()
  const inZone = prov ? o.zones.includes(prov) : null
  return (
    <>
      <div className="bg-secondary border-border my-4 grid gap-4 rounded-xl border p-4 text-[0.92rem] sm:grid-cols-2 lg:grid-cols-3">
        <Detail k={t.rates}>
          {eur(o.prices.day)}
          {t.perDay}
          {o.prices.week && (
            <>
              <br />
              {eur(o.prices.week)}
              {t.perWeek}
            </>
          )}
          {o.prices.month && (
            <>
              <br />
              {eur(o.prices.month)}
              {t.perMonth}
            </>
          )}
        </Detail>
        <Detail k={t.minRental}>
          {t.days(o.minDays)} · {num(o.hoursPerDay)} {t.hoursPerDay}
          {o.extraHourPrice && <Small>{t.overtime(eur(o.extraHourPrice))}</Small>}
        </Detail>
        <Detail k={t.transport}>
          {L.TRANSPORT_MODE[o.transport.mode]}
          {o.transport.mode === "fixed" && t.roundTrip(eur(o.transport.price))}
        </Detail>
        <Detail k={t.operator}>
          {L.OPERATOR_MODE[o.operator.mode]}
          {o.operator.pricePerDay ? `: ${eur(o.operator.pricePerDay)}${t.perDay}` : ""}
        </Detail>
        <Detail k={t.deposit}>{o.deposit ? eur(o.deposit) : t.none}</Detail>
        <Detail k={t.depotArea}>
          {o.partner.city} · {o.zones.join(", ")}{" "}
          {inZone === false && <Badge tone="warn">{t.outsideArea}</Badge>}
          {inZone && <Badge tone="ok">{t.serves(prov)}</Badge>}
        </Detail>
        <Detail k={t.accessories} wide>
          {o.accessories.length ? (
            <ul className="m-0 list-none p-0">
              {o.accessories.map((a) => (
                <li key={a.accessoryId}>
                  {a.name}:{" "}
                  {a.included ? (
                    <b>{t.included}</b>
                  ) : (
                    `${eur(a.day)}${t.perDay}${a.week ? ` · ${eur(a.week)}${t.perWeek}` : ""}`
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-muted-foreground">{t.noAccessories}</span>
          )}
        </Detail>
        {o.conditions.length > 0 && (
          <Detail k={t.conditions} wide>
            <MarkList items={o.conditions} />
          </Detail>
        )}
      </div>
      <Badge tone="warn">{t.availability}</Badge>
    </>
  )
}

function Detail({ k, wide, children }: { k: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? "sm:col-span-2 lg:col-span-3" : undefined}>
      <span className="text-muted-foreground block text-[0.78rem] font-bold tracking-wide uppercase">
        {k}
      </span>
      {children}
    </div>
  )
}

export function ModelDetailView({ id, query }: { id: string; query: Record<string, string> }) {
  const router = useRouter()
  const t = useMessages(M)
  const ct = useCatalogText()
  const { eur, eurWhole, num } = useFormat()
  const meta = useMeta().data
  const detail = useQuery({
    queryKey: ["model", id],
    queryFn: () => api.get<ModelDetail>(`/api/models/${id}`),
  })
  const [adding, setAdding] = useState<PublicOffer | null>(null)
  const [compareIds, setCompareIds] = useState<string[] | null>(null)
  const prov = query.prov ?? ""

  return (
    <QueryView query={detail}>
      {({ model: m, offers, accessories }) => {
        const selected = compareIds ?? offers.map((o) => o.id)
        const catName = ct.category(
          m.category,
          meta?.categories.find((x) => x.id === m.category)?.name ?? m.category
        )
        return (
          <>
            <Crumbs
              items={[
                [t.catalog, "/catalog"],
                [catName, `/catalog?cat=${m.category}`],
                [`${m.brand} ${m.model}`],
              ]}
            />
            <section className="border-border bg-card shadow-lift mb-6 grid overflow-hidden rounded-2xl border lg:grid-cols-[1.05fr_1fr]">
              <div className="bg-ink relative aspect-[3/2] overflow-hidden lg:aspect-auto lg:min-h-[420px]">
                <MachinePhoto
                  src={m.image}
                  alt={t.photoAlt(catName)}
                  sizes="(min-width: 1024px) 640px, 100vw"
                  fit="contain"
                  eager
                />
                <span className="absolute bottom-3 left-3 rounded-md bg-black/55 px-2 py-0.5 text-[0.72rem] text-white/90">
                  {t.photoNote}
                </span>
              </div>
              <div className="flex flex-col p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="accent">{catName}</Badge>
                  <Badge>{ct.subtype(m.subtype)}</Badge>
                </div>
                <h1 className="mt-3 mb-2 text-[2.3rem] sm:text-[2.8rem]">
                  {m.brand} {m.model}
                </h1>
                <p className="text-muted-foreground mb-5 text-[1.03rem]">{m.description}</p>
                <div className="mb-5 grid grid-cols-2 gap-2.5">
                  {m.specList.slice(0, 4).map((sp) => (
                    <div key={sp.key} className="bg-muted/70 rounded-xl px-3.5 py-2.5">
                      <div className="text-muted-foreground text-[0.74rem]">
                        {ct.spec(sp.label)}
                      </div>
                      <div className="text-[1.05rem] font-semibold">
                        {typeof sp.value === "number" ? num(sp.value) : sp.value}
                        {sp.unit && (
                          <span className="text-muted-foreground text-[0.85rem] font-normal">
                            {" "}
                            {sp.unit}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {offers.length > 0 && (
                  <div className="bg-ink text-ink-foreground relative mt-auto flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl p-5">
                    <div className="relative">
                      <div className="text-ink-foreground/65 text-[0.82rem]">
                        {t.offersFrom(offers.length)}
                      </div>
                      <div className="text-primary text-[2.2rem] leading-none font-bold">
                        {eurWhole(Math.min(...offers.map((o) => o.prices.day ?? Infinity)))}
                        <span className="text-ink-foreground/60 font-sans text-sm">
                          {" "}
                          {t.perDayExclVat}
                        </span>
                      </div>
                    </div>
                    <a
                      href="#offers"
                      className={buttonVariants({
                        variant: "primary",
                        size: "lg",
                        className: "relative",
                      })}
                    >
                      {t.seeOffers} <ArrowDown aria-hidden />
                    </a>
                  </div>
                )}
              </div>
            </section>

            <div className="mb-10 grid gap-4 lg:grid-cols-3">
              <Card>
                <PanelTitle icon={Ruler}>{t.specifications}</PanelTitle>
                <KV
                  items={m.specList.map((sp) => [
                    ct.spec(sp.label),
                    `${typeof sp.value === "number" ? num(sp.value) : sp.value} ${sp.unit}`,
                  ])}
                />
                <Small className="text-faint mt-3">{t.indicative}</Small>
              </Card>
              <Card>
                <PanelTitle icon={HardHat}>{t.suitableJobs}</PanelTitle>
                <MarkList tone="tick" items={m.jobs} className="space-y-1.5" />
                <h4 className="mt-5 mb-2 text-[0.95rem]">{t.limitations}</h4>
                <MarkList items={m.limits} className="text-muted-foreground" />
              </Card>
              <Card>
                <PanelTitle icon={Puzzle}>{t.compatibleAccessories}</PanelTitle>
                {accessories.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {accessories.map((a) => (
                      <Badge key={a.id} className="px-3 py-1 text-[0.8rem]">
                        {a.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <Small>{t.noCompatible}</Small>
                )}
              </Card>
            </div>

            <div
              id="offers"
              className="mb-2 flex scroll-mt-28 flex-wrap items-end justify-between gap-3"
            >
              <div>
                <div className="eyebrow mb-2">{t.rentalCompanies}</div>
                <h2 className="m-0 text-[2rem]">{t.offersTitle(offers.length)}</h2>
              </div>
              {offers.length > 1 && (
                <Button
                  onClick={() => {
                    if (selected.length < 2) return toast.error(t.selectTwo)
                    router.push(
                      `/compare${qs({ offers: selected.join(","), from: query.from, to: query.to, prov: query.prov })}`
                    )
                  }}
                >
                  <Scale aria-hidden /> {t.compareSelected}
                </Button>
              )}
            </div>
            <Small className="mb-4">{t.pricesNote}</Small>
            <div className="space-y-3.5">
              {offers.map((o, i) => (
                <Card
                  key={o.id}
                  className={i === 0 && offers.length > 1 ? "ring-primary/40 ring-2" : undefined}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <span
                        aria-hidden
                        className="bg-ink inline-flex size-12 shrink-0 items-center justify-center rounded-xl text-[0.95rem] font-bold text-white"
                      >
                        {stripDemo(o.partner.name)
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((w) => w[0])
                          .join("")}
                      </span>
                      <div>
                        <h3 className="m-0 flex flex-wrap items-center gap-2">
                          {stripDemo(o.partner.name)}
                          {i === 0 && offers.length > 1 && <Badge tone="accent">{t.lowest}</Badge>}
                          {!o.partner.verified && <Badge tone="warn">{t.verifying}</Badge>}
                        </h3>
                        <Small className="flex items-center gap-1">
                          <MapPin aria-hidden className="size-3.5" />
                          {t.depot(o.partner.city, o.partner.province)}
                        </Small>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="text-right leading-tight">
                        <span className="text-[1.8rem] font-bold">{eur(o.prices.day)}</span>
                        <span className="text-muted-foreground text-sm"> {t.perDay}</span>
                        {o.prices.week && (
                          <Small>
                            {eur(o.prices.week)} {t.perWeek}
                          </Small>
                        )}
                      </div>
                      {offers.length > 1 && (
                        <Check
                          label={t.compare}
                          checked={selected.includes(o.id)}
                          onChange={(e) =>
                            setCompareIds(
                              e.target.checked
                                ? [...selected, o.id]
                                : selected.filter((x) => x !== o.id)
                            )
                          }
                        />
                      )}
                      <Button variant="primary" onClick={() => setAdding(o)}>
                        <Plus aria-hidden /> {t.addToRequest}
                      </Button>
                    </div>
                  </div>
                  {o.photos.length > 0 && (
                    <div className="mt-2.5 flex gap-2 overflow-x-auto">
                      {o.photos.map((f) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={f}
                          src={photoUrl(f)}
                          alt={t.partnerPhoto}
                          className="h-24 rounded border object-cover"
                        />
                      ))}
                    </div>
                  )}
                  <OfferDetails o={o} prov={prov} />
                </Card>
              ))}
            </div>
            {adding && (
              <AddToDraftDialog
                offer={adding}
                model={m as PublicModel}
                preset={{ from: query.from, to: query.to }}
                onClose={() => setAdding(null)}
              />
            )}
          </>
        )
      }}
    </QueryView>
  )
}
