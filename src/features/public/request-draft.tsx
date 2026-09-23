"use client"

import { useMutation, useQueries, useQuery } from "@tanstack/react-query"
import { ClipboardList } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo } from "react"
import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm"
import { PageHead, Small } from "@/components/app/bits"
import { QueryView } from "@/components/app/query-view"
import { EmptyState } from "@/components/states/empty-state"
import { LoadingState } from "@/components/states/loading-state"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, ChipCheck, Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { api, ApiError } from "@/lib/machina/api"
import { clearDraft, saveDraft, useDraft, type Draft, type DraftItem } from "@/lib/machina/draft"
import { addDays, eur, today } from "@/lib/machina/format"
import { useMe, useMeta } from "@/lib/machina/hooks"
import { OPERATOR_MODE, TRANSPORT_MODE } from "@/lib/machina/labels"
import type { Client, EstimateGroup, ModelDetail, RentalRequest } from "@/lib/machina/types"
import { useDebounced, useHydrated } from "@/lib/machina/use-hydrated"

export function RequestDraftView() {
  const hydrated = useHydrated()
  const me = useMe()
  const draft = useDraft()

  if (!hydrated || me.isPending) return <LoadingState />
  if (me.data?.user.role === "partner") {
    return <EmptyState title="Rental requests are sent from a customer account." />
  }
  if (!draft.items.length) {
    return (
      <>
        <h1>Your request</h1>
        <EmptyState
          icon={ClipboardList}
          title="Your request is empty."
          description="Add machines from the catalogue, or let the assistant help you."
          action={
            <div className="flex gap-2">
              <Link href="/catalog" className={buttonVariants({ variant: "primary" })}>
                Catalogue
              </Link>
              <Link href="/assistant" className={buttonVariants()}>
                Describe your job
              </Link>
            </div>
          }
        />
      </>
    )
  }
  return <DraftEditor draft={draft} isClient={me.data?.user.role === "client"} />
}

function DraftEditor({ draft: d, isClient }: { draft: Draft; isClient: boolean }) {
  const router = useRouter()
  const confirm = useConfirm()
  const meta = useMeta().data
  const modelIds = useMemo(() => [...new Set(d.items.map((i) => i.modelId))], [d.items])
  const modelQueries = useQueries({
    queries: modelIds.map((id) => ({
      queryKey: ["model", id],
      queryFn: () => api.get<ModelDetail>(`/api/models/${id}`),
      retry: false,
    })),
  })
  const company = useQuery({
    queryKey: ["buyer", "company"],
    queryFn: () => api.get<Client>("/api/client/company"),
    enabled: isClient,
  })
  const models: Record<string, ModelDetail> = {}
  modelQueries.forEach((q, i) => q.data && (models[modelIds[i]] = q.data))
  const loading = modelQueries.some((q) => q.isPending)

  const update = (patch: Partial<Draft>) => saveDraft({ ...d, ...patch })
  const updateItem = (id: string, patch: Partial<DraftItem>) =>
    update({ items: d.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) })

  // Fill a default period and drop machines whose model no longer exists.
  useEffect(() => {
    if (!d.from || !d.to) {
      const from = d.from || addDays(today(), 7)
      saveDraft({ ...d, from, to: d.to || addDays(from, 4) })
    }
    if (!loading) {
      const valid = d.items.filter((it) => models[it.modelId])
      if (valid.length !== d.items.length) saveDraft({ ...d, items: valid })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, d.from, d.to])

  const sites = company.data?.sites ?? []
  const province =
    (d.siteId && sites.find((s) => s.id === d.siteId)?.province) || d.site.province || "TO"
  // Debounce a string: a fresh object each render would never settle.
  const estimateKey = useDebounced(
    JSON.stringify({ items: d.items, from: d.from, to: d.to, province }),
    250
  )
  const estimate = useQuery({
    queryKey: ["estimate", estimateKey],
    queryFn: () => api.post<{ groups: EstimateGroup[] }>("/api/estimate", JSON.parse(estimateKey)),
    enabled: Boolean(d.from && d.to),
    placeholderData: (prev) => prev,
    retry: false,
  })

  const send = useMutation({
    mutationFn: () =>
      api.post<RentalRequest>("/api/client/requests", {
        items: d.items,
        from: d.from,
        to: d.to,
        needs: d.needs,
        jobDescription: d.jobDescription,
        source: d.source,
        ...(d.siteId ? { siteId: d.siteId } : { site: d.site }),
      }),
    onSuccess: (r) => {
      clearDraft()
      toast.success(
        `Request ${r.code} sent to ${r.quoteIds.length} partner${r.quoteIds.length === 1 ? "" : "s"}`
      )
      router.push(`/buyer/requests/${r.id}`)
    },
    onError: (err) => toast.error(err.message),
  })
  const errors = send.error instanceof ApiError ? send.error.fields : {}

  if (loading) return <LoadingState />

  const provinceOptions = (meta?.provinces ?? []).map((p) => [p.id, `${p.name} (${p.id})`] as const)

  return (
    <>
      <PageHead
        title="Your request"
        actions={
          <Link href="/catalog" className={buttonVariants()}>
            + Add machines
          </Link>
        }
      >
        Machina prepares a draft with the published rates and conditions. Each partner only receives
        its own lines and has to confirm them.
      </PageHead>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <h2>Machines and accessories</h2>
          {errors.items && (
            <Alert tone="bad" className="mb-3">
              {errors.items}
            </Alert>
          )}
          {d.items.map((it) => {
            const md = models[it.modelId]
            if (!md) return null
            const offer = md.offers.find((o) => o.id === it.offerId) ?? md.offers[0]
            if (!offer) return null
            const opMode = offer.operator.mode
            return (
              <Card key={it.id} flat className="mb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Small>{meta?.categories.find((c) => c.id === md.model.category)?.name}</Small>
                    <h3 className="m-0">
                      {md.model.brand} {md.model.model}
                    </h3>
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => update({ items: d.items.filter((x) => x.id !== it.id) })}
                  >
                    Remove
                  </Button>
                </div>
                <div className="mt-2.5 grid gap-x-3.5 sm:grid-cols-2">
                  <Field label="Offer (partner)" htmlFor={`o-${it.id}`}>
                    <Select
                      id={`o-${it.id}`}
                      value={offer.id}
                      onChange={(e) => {
                        const next = md.offers.find((o) => o.id === e.target.value)!
                        const offered = new Set(next.accessories.map((a) => a.accessoryId))
                        updateItem(it.id, {
                          offerId: next.id,
                          accessoryIds: it.accessoryIds.filter((a) => offered.has(a)),
                          transport: it.transport && next.transport.mode !== "unavailable",
                          operator: it.operator && next.operator.mode !== "unavailable",
                        })
                      }}
                      options={md.offers.map(
                        (o) => [o.id, `${o.partner.name} — ${eur(o.prices.day)}/day`] as const
                      )}
                    />
                  </Field>
                  <Field label="Quantity" htmlFor={`q-${it.id}`}>
                    <Input
                      id={`q-${it.id}`}
                      type="number"
                      min={1}
                      max={10}
                      value={it.qty}
                      onChange={(e) =>
                        updateItem(it.id, {
                          qty: Math.max(1, Math.trunc(Number(e.target.value)) || 1),
                        })
                      }
                    />
                  </Field>
                </div>
                {md.accessories.length > 0 && (
                  <fieldset className="mb-3">
                    <legend className="mb-1 text-[0.85rem] font-semibold">Accessories</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {md.accessories.map((a) => {
                        const oa = offer.accessories.find((x) => x.accessoryId === a.id)
                        return (
                          <ChipCheck
                            key={a.id}
                            disabled={!oa}
                            checked={Boolean(oa) && it.accessoryIds.includes(a.id)}
                            onChange={(e) =>
                              updateItem(it.id, {
                                accessoryIds: e.target.checked
                                  ? [...it.accessoryIds, a.id]
                                  : it.accessoryIds.filter((x) => x !== a.id),
                              })
                            }
                            label={
                              <>
                                {a.name}{" "}
                                <span className="text-muted-foreground text-[0.8rem]">
                                  {oa
                                    ? oa.included
                                      ? "included"
                                      : `${eur(oa.day)}/day`
                                    : "not offered"}
                                </span>
                              </>
                            }
                          />
                        )
                      })}
                    </div>
                  </fieldset>
                )}
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  <Check
                    checked={it.transport}
                    disabled={offer.transport.mode === "unavailable"}
                    onChange={(e) => updateItem(it.id, { transport: e.target.checked })}
                    label={`Transport (${TRANSPORT_MODE[offer.transport.mode]})`}
                  />
                  <Check
                    checked={it.operator || opMode === "included"}
                    disabled={opMode === "unavailable" || opMode === "included"}
                    onChange={(e) => updateItem(it.id, { operator: e.target.checked })}
                    label={`Operator (${OPERATOR_MODE[opMode]})`}
                  />
                </div>
              </Card>
            )
          })}

          <Card flat>
            <h2>Site, period and needs</h2>
            {isClient && (
              <Field label="Site" htmlFor="d-site" error={errors.siteId}>
                <Select
                  id="d-site"
                  value={d.siteId}
                  onChange={(e) => update({ siteId: e.target.value })}
                  options={[
                    ["", "New address…"],
                    ...sites.map((s) => [s.id, `${s.name} — ${s.city}`] as const),
                  ]}
                />
              </Field>
            )}
            {!d.siteId && (
              <div className="grid gap-x-3.5 sm:grid-cols-2">
                <Field label="Site name (optional)" htmlFor="d-sname">
                  <Input
                    id="d-sname"
                    value={d.site.name}
                    onChange={(e) => update({ site: { ...d.site, name: e.target.value } })}
                  />
                </Field>
                <Field label="Address" htmlFor="d-saddr" error={errors["site.address"]}>
                  <Input
                    id="d-saddr"
                    aria-invalid={!!errors["site.address"]}
                    value={d.site.address}
                    onChange={(e) => update({ site: { ...d.site, address: e.target.value } })}
                  />
                </Field>
                <Field label="Town" htmlFor="d-scity" error={errors["site.city"]}>
                  <Input
                    id="d-scity"
                    aria-invalid={!!errors["site.city"]}
                    value={d.site.city}
                    onChange={(e) => update({ site: { ...d.site, city: e.target.value } })}
                  />
                </Field>
                <Field label="Province" htmlFor="d-sprov" error={errors["site.province"]}>
                  <Select
                    id="d-sprov"
                    value={d.site.province || "TO"}
                    onChange={(e) => update({ site: { ...d.site, province: e.target.value } })}
                    options={provinceOptions}
                  />
                </Field>
              </div>
            )}
            <div className="grid gap-x-3.5 sm:grid-cols-2">
              <Field label="From" htmlFor="d-from" error={errors.from}>
                <Input
                  id="d-from"
                  type="date"
                  min={today()}
                  aria-invalid={!!errors.from}
                  value={d.from}
                  onChange={(e) => update({ from: e.target.value })}
                />
              </Field>
              <Field label="To" htmlFor="d-to" error={errors.to}>
                <Input
                  id="d-to"
                  type="date"
                  aria-invalid={!!errors.to}
                  value={d.to}
                  onChange={(e) => update({ to: e.target.value })}
                />
              </Field>
              <Field label="Access / narrowest passage" htmlFor="d-access">
                <Input
                  id="d-access"
                  placeholder="E.g. gate 1.5 m"
                  value={d.needs.accessWidth}
                  onChange={(e) => update({ needs: { ...d.needs, accessWidth: e.target.value } })}
                />
              </Field>
              <Field label="Ground, slope, manoeuvring space" htmlFor="d-ground">
                <Input
                  id="d-ground"
                  placeholder="E.g. flat, unpaved"
                  value={d.needs.ground}
                  onChange={(e) => update({ needs: { ...d.needs, ground: e.target.value } })}
                />
              </Field>
              <Field label="Delivery hours and limits" htmlFor="d-sched">
                <Input
                  id="d-sched"
                  placeholder="E.g. 7:30–17:00, restricted zone"
                  value={d.needs.schedule}
                  onChange={(e) => update({ needs: { ...d.needs, schedule: e.target.value } })}
                />
              </Field>
              <Field label="Other needs" htmlFor="d-notes">
                <Input
                  id="d-notes"
                  value={d.needs.notes}
                  onChange={(e) => update({ needs: { ...d.needs, notes: e.target.value } })}
                />
              </Field>
            </div>
            <Field label="Job description" htmlFor="d-job">
              <Textarea
                id="d-job"
                value={d.jobDescription}
                onChange={(e) => update({ jobDescription: e.target.value })}
              />
            </Field>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-[88px]">
          <Card>
            <h3>Draft prepared by Machina</h3>
            <div className="text-sm">
              {estimate.isError ? (
                <Alert tone="warn" size="sm">
                  {estimate.error.message}
                  {estimate.error instanceof ApiError && (
                    <ul className="mt-1 list-disc pl-4">
                      {Object.values(estimate.error.fields).map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  )}
                </Alert>
              ) : (
                <QueryView query={estimate} rows={2}>
                  {({ groups }) => <EstimateSummary groups={groups} />}
                </QueryView>
              )}
            </div>
            <div className="mt-3">
              {isClient ? (
                <>
                  <Button
                    variant="primary"
                    size="lg"
                    block
                    disabled={send.isPending}
                    onClick={() => send.mutate()}
                  >
                    {send.isPending ? "Sending…" : "Send request to partners"}
                  </Button>
                  <Button
                    variant="link"
                    className="mt-1.5 text-sm"
                    onClick={async () => {
                      if (
                        await confirm({
                          title: "Clear the request?",
                          body: "The selected machines will be removed.",
                          confirmLabel: "Clear",
                          danger: true,
                        })
                      ) {
                        clearDraft()
                      }
                    }}
                  >
                    Clear request
                  </Button>
                </>
              ) : (
                <>
                  <Alert
                    tone="info"
                    size="sm"
                    className="mb-2.5"
                    title="Sign in as a customer to send"
                  >
                    The draft stays saved in this browser.
                  </Alert>
                  <Link
                    href="/login?next=/request"
                    className={buttonVariants({ variant: "primary", block: true })}
                  >
                    Sign in or register
                  </Link>
                </>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </>
  )
}

function EstimateSummary({ groups }: { groups: EstimateGroup[] }) {
  const net = groups.reduce((s, g) => s + g.totals.net, 0)
  const missing = groups.reduce((s, g) => s + g.totals.missing, 0)
  return (
    <>
      {groups.map((g) => (
        <div key={g.partnerId} className="border-b py-2">
          <div className="flex justify-between gap-2">
            <b>{g.partnerName}</b>
            <span>
              {eur(g.totals.net)} {!g.totals.complete && <Badge tone="warn">partial</Badge>}
            </span>
          </div>
          <ul className="text-muted-foreground m-0 list-none p-0">
            {g.lines.map((l, i) => (
              <li key={i}>
                {l.description}:{" "}
                {l.amount === null ? <Badge tone="warn">to price</Badge> : eur(l.amount)}
              </li>
            ))}
          </ul>
          {g.warnings.length > 0 && (
            <ul className="text-warn mt-1 list-disc pl-4">
              {g.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
      <div className="flex justify-between pt-2">
        <b>Estimated net</b>
        <b>{eur(net)}</b>
      </div>
      <p className="text-muted-foreground mt-1">
        Excluding VAT. {missing > 0 && <b>{missing} lines to price: the total is not final. </b>}
        Prices and availability will be confirmed by each partner in the final quote.
      </p>
      <p className="mt-1.5">
        Will be sent to <b>{groups.length}</b> partner{groups.length === 1 ? "" : "s"}.
      </p>
    </>
  )
}
