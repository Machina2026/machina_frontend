"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Crumbs, DemoBadge, KV, MarkList, Small } from "@/components/app/bits"
import { ModelImage } from "@/components/app/model-image"
import { QueryView } from "@/components/app/query-view"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check } from "@/components/ui/field"
import { api, fileUrl, qs } from "@/lib/machina/api"
import { eur, num } from "@/lib/machina/format"
import { useMeta } from "@/lib/machina/hooks"
import { OPERATOR_MODE, TRANSPORT_MODE } from "@/lib/machina/labels"
import type { ModelDetail, PublicModel, PublicOffer } from "@/lib/machina/types"

import { AddToDraftDialog } from "./add-to-draft"

function OfferDetails({ o, prov }: { o: PublicOffer; prov: string }) {
  const inZone = prov ? o.zones.includes(prov) : null
  return (
    <>
      <div className="my-3 grid gap-3 text-[0.92rem] sm:grid-cols-2 lg:grid-cols-3">
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
            <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
              <ModelImage src={m.image} alt={`${m.brand} ${m.model}`} />
              <div>
                <Small>
                  {catName} · {m.subtype} {m.demo && <DemoBadge />}
                </Small>
                <h1 className="my-1">
                  {m.brand} {m.model}
                </h1>
                <p>{m.description}</p>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <h4 className="mb-2">Specifications</h4>
                    <KV
                      items={m.specList.map((s) => [
                        s.label,
                        `${typeof s.value === "number" ? num(s.value) : s.value} ${s.unit}`,
                      ])}
                    />
                    <Small className="text-faint mt-2">
                      Indicative figures: check the manufacturer&apos;s sheet and the rental
                      company.
                    </Small>
                  </div>
                  <div>
                    <h4 className="mb-2">Suitable jobs</h4>
                    <MarkList tone="tick" items={m.jobs} />
                    <h4 className="mt-3 mb-2">Limitations</h4>
                    <MarkList items={m.limits} />
                  </div>
                </div>
                {accessories.length > 0 && (
                  <>
                    <h4 className="mt-3 mb-2">Compatible accessories</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {accessories.map((a) => (
                        <Badge key={a.id}>{a.name}</Badge>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <hr className="border-border my-5" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="m-0">Rental company offers ({offers.length})</h2>
              {offers.length > 1 && (
                <Button
                  onClick={() => {
                    if (selected.length < 2) return toast.error("Select at least two offers")
                    router.push(
                      `/compare${qs({ offers: selected.join(","), from: query.from, to: query.to, prov: query.prov })}`
                    )
                  }}
                >
                  Compare selected offers
                </Button>
              )}
            </div>
            <Small className="mb-3">
              Demo prices excluding VAT. Availability is always to be confirmed by the partner.
            </Small>
            <div className="space-y-3.5">
              {offers.map((o) => (
                <Card key={o.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="m-0">
                        {o.partner.name} {o.partner.demo && <DemoBadge />}{" "}
                        {!o.partner.verified && <Badge tone="warn">Partner being verified</Badge>}
                      </h3>
                      <Small>
                        Depot: {o.partner.city} ({o.partner.province})
                      </Small>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
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
                        Add to request
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
