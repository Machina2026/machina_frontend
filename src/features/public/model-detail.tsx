"use client"

import { useQuery } from "@tanstack/react-query"
import { ArrowDown, HardHat, MapPin, Plus, Puzzle, Ruler, Scale } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Crumbs, DemoBadge, KV, MarkList, Small } from "@/components/app/bits"
import { PanelTitle } from "@/components/app/dashboard"
import { MachinePhoto } from "@/components/app/model-image"
import { QueryView } from "@/components/app/query-view"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check } from "@/components/ui/field"
import { api, fileUrl, qs } from "@/lib/machina/api"
import { eur, eurWhole, num, stripDemo } from "@/lib/machina/format"
import { useMeta } from "@/lib/machina/hooks"
import { OPERATOR_MODE, TRANSPORT_MODE } from "@/lib/machina/labels"
import type { ModelDetail, PublicModel, PublicOffer } from "@/lib/machina/types"

import { AddToDraftDialog } from "./add-to-draft"

function OfferDetails({ o, prov }: { o: PublicOffer; prov: string }) {
  const inZone = prov ? o.zones.includes(prov) : null
  return (
    <>
      <div className="bg-secondary border-border/70 my-4 grid gap-4 rounded-xl border p-4 text-[0.92rem] sm:grid-cols-2 lg:grid-cols-3">
        <Detail k="Rates (excl. VAT)">
          {eur(o.prices.day)}/day
          {o.prices.week && (
            <>
              <br />
              {eur(o.prices.week)}/week
            </>
          )}
          {o.prices.month && (
            <>
              <br />
              {eur(o.prices.month)}/month
            </>
          )}
        </Detail>
        <Detail k="Minimum rental · hours included">
          {o.minDays} {o.minDays === 1 ? "day" : "days"} · {num(o.hoursPerDay)} h/day
          {o.extraHourPrice && <Small>Overtime {eur(o.extraHourPrice)}/h billed at cost</Small>}
        </Detail>
        <Detail k="Transport">
          {TRANSPORT_MODE[o.transport.mode]}
          {o.transport.mode === "fixed" && `: ${eur(o.transport.price)} round trip`}
        </Detail>
        <Detail k="Operator">
          {OPERATOR_MODE[o.operator.mode]}
          {o.operator.pricePerDay ? `: ${eur(o.operator.pricePerDay)}/day` : ""}
        </Detail>
        <Detail k="Deposit">{o.deposit ? eur(o.deposit) : "None"}</Detail>
        <Detail k="Depot and area served">
          {o.partner.city} · {o.zones.join(", ")}{" "}
          {inZone === false && <Badge tone="warn">outside area</Badge>}
          {inZone && <Badge tone="ok">serves {prov}</Badge>}
        </Detail>
        <Detail k="Accessories" wide>
          {o.accessories.length ? (
            <ul className="m-0 list-none p-0">
              {o.accessories.map((a) => (
                <li key={a.accessoryId}>
                  {a.name}:{" "}
                  {a.included ? (
                    <b>included</b>
                  ) : (
                    `${eur(a.day)}/day${a.week ? ` · ${eur(a.week)}/week` : ""}`
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-muted-foreground">No accessories listed</span>
          )}
        </Detail>
        {o.conditions.length > 0 && (
          <Detail k="Conditions" wide>
            <MarkList items={o.conditions} />
          </Detail>
        )}
      </div>
      <Badge tone="warn">Availability to be confirmed by the partner</Badge>
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
        const catName = meta?.categories.find((c) => c.id === m.category)?.name ?? m.category
        return (
          <>
            <Crumbs
              items={[
                ["Catalogue", "/catalog"],
                [catName, `/catalog?cat=${m.category}`],
                [`${m.brand} ${m.model}`],
              ]}
            />
            <section className="border-border/70 bg-card shadow-lift mb-6 grid overflow-hidden rounded-3xl border lg:grid-cols-[1.05fr_1fr]">
              <div className="bg-ink relative aspect-[3/2] overflow-hidden lg:aspect-auto lg:min-h-[420px]">
                <MachinePhoto
                  src={m.image}
                  alt={`${catName}: illustrative photo`}
                  sizes="(min-width: 1024px) 640px, 100vw"
                  fit="contain"
                  eager
                />
                <span className="absolute bottom-3 left-3 rounded-md bg-black/55 px-2 py-0.5 text-[0.72rem] text-white/90">
                  Illustrative photo · not the exact model
                </span>
              </div>
              <div className="flex flex-col p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="accent">{catName}</Badge>
                  <Badge>{m.subtype}</Badge>
                  {m.demo && <DemoBadge />}
                </div>
                <h1 className="mt-3 mb-2 text-[2.3rem] sm:text-[2.8rem]">
                  {m.brand} {m.model}
                </h1>
                <p className="text-muted-foreground mb-5 text-[1.03rem]">{m.description}</p>
                <div className="mb-5 grid grid-cols-2 gap-2.5">
                  {m.specList.slice(0, 4).map((sp) => (
                    <div key={sp.key} className="bg-muted/70 rounded-xl px-3.5 py-2.5">
                      <div className="text-muted-foreground text-[0.74rem]">{sp.label}</div>
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
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_120%_at_100%_0%,rgb(236_116_48/0.35),transparent_70%)]"
                    />
                    <div className="relative">
                      <div className="text-ink-foreground/65 text-[0.82rem]">
                        {offers.length} {offers.length === 1 ? "offer" : "offers"} · from
                      </div>
                      <div className="font-heading text-sun text-[2.2rem] leading-none font-medium">
                        {eurWhole(Math.min(...offers.map((o) => o.prices.day ?? Infinity)))}
                        <span className="text-ink-foreground/60 font-sans text-sm">
                          {" "}
                          /day excl. VAT
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
                      See the offers <ArrowDown aria-hidden />
                    </a>
                  </div>
                )}
              </div>
            </section>

            <div className="mb-10 grid gap-4 lg:grid-cols-3">
              <Card>
                <PanelTitle icon={Ruler}>Specifications</PanelTitle>
                <KV
                  items={m.specList.map((sp) => [
                    sp.label,
                    `${typeof sp.value === "number" ? num(sp.value) : sp.value} ${sp.unit}`,
                  ])}
                />
                <Small className="text-faint mt-3">
                  Indicative figures: check the manufacturer&apos;s sheet and the rental company.
                </Small>
              </Card>
              <Card>
                <PanelTitle icon={HardHat}>Suitable jobs</PanelTitle>
                <MarkList tone="tick" items={m.jobs} className="space-y-1.5" />
                <h4 className="mt-5 mb-2 text-[0.95rem]">Limitations</h4>
                <MarkList items={m.limits} className="text-muted-foreground" />
              </Card>
              <Card>
                <PanelTitle icon={Puzzle}>Compatible accessories</PanelTitle>
                {accessories.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {accessories.map((a) => (
                      <Badge key={a.id} className="px-3 py-1 text-[0.8rem]">
                        {a.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <Small>No accessories listed for this model.</Small>
                )}
              </Card>
            </div>

            <div
              id="offers"
              className="mb-2 flex scroll-mt-28 flex-wrap items-end justify-between gap-3"
            >
              <div>
                <div className="eyebrow mb-2">Rental companies</div>
                <h2 className="m-0 text-[2rem]">
                  {offers.length} {offers.length === 1 ? "offer" : "offers"} for this machine
                </h2>
              </div>
              {offers.length > 1 && (
                <Button
                  onClick={() => {
                    if (selected.length < 2) return toast.error("Select at least two offers")
                    router.push(
                      `/compare${qs({ offers: selected.join(","), from: query.from, to: query.to, prov: query.prov })}`
                    )
                  }}
                >
                  <Scale aria-hidden /> Compare selected offers
                </Button>
              )}
            </div>
            <Small className="mb-4">
              Demo prices excluding VAT. Availability is always to be confirmed by the partner.
            </Small>
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
                          {i === 0 && offers.length > 1 && (
                            <Badge tone="accent">Lowest daily rate</Badge>
                          )}
                          {!o.partner.verified && <Badge tone="warn">Partner being verified</Badge>}
                        </h3>
                        <Small className="flex items-center gap-1">
                          <MapPin aria-hidden className="size-3.5" />
                          Depot: {o.partner.city} ({o.partner.province})
                        </Small>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="text-right leading-tight">
                        <span className="font-heading text-[1.8rem] font-medium">
                          {eur(o.prices.day)}
                        </span>
                        <span className="text-muted-foreground text-sm"> /day</span>
                        {o.prices.week && <Small>{eur(o.prices.week)} /week</Small>}
                      </div>
                      {offers.length > 1 && (
                        <Check
                          label="Compare"
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
                        <Plus aria-hidden /> Add to request
                      </Button>
                    </div>
                  </div>
                  {o.photos.length > 0 && (
                    <div className="mt-2.5 flex gap-2 overflow-x-auto">
                      {o.photos.map((f) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={f}
                          src={fileUrl(f)}
                          alt="Partner's photo"
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
