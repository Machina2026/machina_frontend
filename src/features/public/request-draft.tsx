"use client"

import { useMutation, useQueries, useQuery } from "@tanstack/react-query"
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
import { useCatalogText } from "@/i18n/catalog"
import { useFormat, useMessages } from "@/i18n/client"
import { useCommon } from "@/i18n/common"
import { defineMessages, plural } from "@/i18n/messages"
import { addDays, stripDemo, today } from "@/lib/machina/format"
import { useMe, useMeta } from "@/lib/machina/hooks"
import { useLabels } from "@/lib/machina/labels"
import type { Client, EstimateGroup, ModelDetail, RentalRequest } from "@/lib/machina/types"
import { useDebounced, useHydrated } from "@/lib/machina/use-hydrated"

const M = defineMessages({
  en: {
    partnerNotice: "Rental requests are sent from a customer account.",
    title: "Your request",
    emptyTitle: "Your request is empty",
    emptyBody:
      "Add machines from the catalogue, or describe the job and let the assistant pick them. You then send one request and each rental company replies with its own quote.",
    catalog: "Catalogue",
    describeJob: "Describe your job",
    sent: (code: string, n: number) =>
      `Request ${code} sent to ${n} ${plural(n, "partner", "partners")}`,
    addMachines: "+ Add machines",
    intro:
      "Machina prepares a draft with the published rates and conditions. Each partner only receives its own lines and has to confirm them.",
    step1: "Machines and accessories",
    step1Hint: "Pick the offer, accessories, delivery and operator for each machine.",
    offer: "Offer (partner)",
    perDay: "/day",
    quantity: "Quantity",
    accessories: "Accessories",
    included: "included",
    notOffered: "not offered",
    transport: (mode: string) => `Transport (${mode})`,
    operator: (mode: string) => `Operator (${mode})`,
    step2: "Site, period and needs",
    step2Hint: "Where and when. Access and ground details help partners confirm the right machine.",
    site: "Site",
    newAddress: "New address…",
    siteName: "Site name (optional)",
    address: "Address",
    town: "Town",
    province: "Province",
    from: "From",
    to: "To",
    access: "Access / narrowest passage",
    accessPh: "E.g. gate 1.5 m",
    ground: "Ground, slope, manoeuvring space",
    groundPh: "E.g. flat, unpaved",
    schedule: "Delivery hours and limits",
    schedulePh: "E.g. 7:30–17:00, restricted zone",
    otherNeeds: "Other needs",
    job: "Job description",
    step3: "Step 3 · Review and send",
    draftTitle: "Draft prepared by Machina",
    sending: "Sending…",
    send: "Send request to partners",
    clearTitle: "Clear the request?",
    clearBody: "The selected machines will be removed.",
    clear: "Clear",
    clearRequest: "Clear request",
    signInToSend: "Sign in as a customer to send",
    savedHere: "The draft stays saved in this browser.",
    signInOrRegister: "Sign in or register",
    partial: "partial",
    toPrice: "to price",
    estimatedNet: "Estimated net",
    exclVat: "Excluding VAT.",
    linesToPrice: (n: number) =>
      `${n} ${plural(n, "line", "lines")} to price: the total is not final.`,
    confirmedLater: "Prices and availability will be confirmed by each partner in the final quote.",
    sentTo: (b: React.ReactNode, n: number) => (
      <>
        Will be sent to {b} {plural(n, "partner", "partners")}.
      </>
    ),
  },
  it: {
    partnerNotice: "Le richieste di noleggio si inviano da un account cliente.",
    title: "La tua richiesta",
    emptyTitle: "La tua richiesta è vuota",
    emptyBody:
      "Aggiungi macchine dal catalogo, oppure descrivi il lavoro e lascia che l'assistente le scelga. Poi invii una sola richiesta e ogni noleggiatore risponde con il proprio preventivo.",
    catalog: "Catalogo",
    describeJob: "Descrivi il lavoro",
    sent: (code: string, n: number) =>
      `Richiesta ${code} inviata a ${n} ${plural(n, "noleggiatore", "noleggiatori")}`,
    addMachines: "+ Aggiungi macchine",
    intro:
      "Machina prepara una bozza con le tariffe e le condizioni pubblicate. Ogni noleggiatore riceve solo le proprie righe e deve confermarle.",
    step1: "Macchine e accessori",
    step1Hint: "Scegli offerta, accessori, consegna e operatore per ogni macchina.",
    offer: "Offerta (noleggiatore)",
    perDay: "/giorno",
    quantity: "Quantità",
    accessories: "Accessori",
    included: "incluso",
    notOffered: "non offerto",
    transport: (mode: string) => `Trasporto (${mode})`,
    operator: (mode: string) => `Operatore (${mode})`,
    step2: "Cantiere, periodo ed esigenze",
    step2Hint:
      "Dove e quando. I dettagli su accesso e terreno aiutano i noleggiatori a confermare la macchina giusta.",
    site: "Cantiere",
    newAddress: "Nuovo indirizzo…",
    siteName: "Nome del cantiere (facoltativo)",
    address: "Indirizzo",
    town: "Comune",
    province: "Provincia",
    from: "Dal",
    to: "Al",
    access: "Accesso / passaggio più stretto",
    accessPh: "Es. cancello da 1,5 m",
    ground: "Terreno, pendenza, spazio di manovra",
    groundPh: "Es. pianeggiante, sterrato",
    schedule: "Orari di consegna e vincoli",
    schedulePh: "Es. 7:30–17:00, ZTL",
    otherNeeds: "Altre esigenze",
    job: "Descrizione del lavoro",
    step3: "Passo 3 · Controlla e invia",
    draftTitle: "Bozza preparata da Machina",
    sending: "Invio in corso…",
    send: "Invia la richiesta ai noleggiatori",
    clearTitle: "Svuotare la richiesta?",
    clearBody: "Le macchine selezionate verranno rimosse.",
    clear: "Svuota",
    clearRequest: "Svuota la richiesta",
    signInToSend: "Accedi come cliente per inviare",
    savedHere: "La bozza resta salvata in questo browser.",
    signInOrRegister: "Accedi o registrati",
    partial: "parziale",
    toPrice: "da quotare",
    estimatedNet: "Imponibile stimato",
    exclVat: "IVA esclusa.",
    linesToPrice: (n: number) =>
      `${n} ${plural(n, "riga da quotare", "righe da quotare")}: il totale non è definitivo.`,
    confirmedLater:
      "Prezzi e disponibilità saranno confermati da ogni noleggiatore nel preventivo finale.",
    sentTo: (b: React.ReactNode, n: number) => (
      <>
        Sarà inviata a {b} {plural(n, "noleggiatore", "noleggiatori")}.
      </>
    ),
  },
})

export function RequestDraftView() {
  const t = useMessages(M)
  const hydrated = useHydrated()
  const me = useMe()
  const draft = useDraft()

  if (!hydrated || me.isPending) return <LoadingState />
  if (me.data?.user.role === "partner") {
    return <EmptyState title={t.partnerNotice} />
  }
  if (!draft.items.length) {
    return (
      <>
        <h1>{t.title}</h1>
        <EmptyState
          image="/img/empty-request.svg"
          title={t.emptyTitle}
          description={t.emptyBody}
          action={
            <div className="flex gap-2">
              <Link href="/catalog" className={buttonVariants({ variant: "primary" })}>
                {t.catalog}
              </Link>
              <Link href="/assistant" className={buttonVariants()}>
                {t.describeJob}
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
  const t = useMessages(M)
  const c = useCommon()
  const ct = useCatalogText()
  const L = useLabels()
  const { eur } = useFormat()
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
      toast.success(t.sent(r.code, r.quoteIds.length))
      router.push(`/buyer/requests/${r.id}`)
    },
    onError: (err) => toast.error(err.message),
  })
  const errors = send.error instanceof ApiError ? send.error.fields : {}

  if (loading) return <LoadingState />

  const provinceOptions = (meta?.provinces ?? []).map(
    (p) => [p.id, `${ct.province(p.id, p.name)} (${p.id})`] as const
  )

  return (
    <>
      <PageHead
        title={t.title}
        actions={
          <Link href="/catalog" className={buttonVariants()}>
            {t.addMachines}
          </Link>
        }
      >
        {t.intro}
      </PageHead>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <StepTitle n={1} title={t.step1} hint={t.step1Hint} />
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
                    <Small>
                      {ct.category(
                        md.model.category,
                        meta?.categories.find((x) => x.id === md.model.category)?.name ?? ""
                      )}
                    </Small>
                    <h3 className="m-0">
                      {md.model.brand} {md.model.model}
                    </h3>
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => update({ items: d.items.filter((x) => x.id !== it.id) })}
                  >
                    {c.remove}
                  </Button>
                </div>
                <div className="mt-2.5 grid gap-x-3.5 sm:grid-cols-2">
                  <Field label={t.offer} htmlFor={`o-${it.id}`}>
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
                        (o) =>
                          [o.id, `${o.partner.name} — ${eur(o.prices.day)}${t.perDay}`] as const
                      )}
                    />
                  </Field>
                  <Field label={t.quantity} htmlFor={`q-${it.id}`}>
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
                    <legend className="mb-1 text-[0.85rem] font-semibold">{t.accessories}</legend>
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
                                      ? t.included
                                      : `${eur(oa.day)}${t.perDay}`
                                    : t.notOffered}
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
                    label={t.transport(L.TRANSPORT_MODE[offer.transport.mode])}
                  />
                  <Check
                    checked={it.operator || opMode === "included"}
                    disabled={opMode === "unavailable" || opMode === "included"}
                    onChange={(e) => updateItem(it.id, { operator: e.target.checked })}
                    label={t.operator(L.OPERATOR_MODE[opMode])}
                  />
                </div>
              </Card>
            )
          })}

          <Card flat>
            <StepTitle n={2} title={t.step2} hint={t.step2Hint} />
            {isClient && (
              <Field label={t.site} htmlFor="d-site" error={errors.siteId}>
                <Select
                  id="d-site"
                  value={d.siteId}
                  onChange={(e) => update({ siteId: e.target.value })}
                  options={[
                    ["", t.newAddress],
                    ...sites.map((s) => [s.id, `${s.name} — ${s.city}`] as const),
                  ]}
                />
              </Field>
            )}
            {!d.siteId && (
              <div className="grid gap-x-3.5 sm:grid-cols-2">
                <Field label={t.siteName} htmlFor="d-sname">
                  <Input
                    id="d-sname"
                    value={d.site.name}
                    onChange={(e) => update({ site: { ...d.site, name: e.target.value } })}
                  />
                </Field>
                <Field label={t.address} htmlFor="d-saddr" error={errors["site.address"]}>
                  <Input
                    id="d-saddr"
                    aria-invalid={!!errors["site.address"]}
                    value={d.site.address}
                    onChange={(e) => update({ site: { ...d.site, address: e.target.value } })}
                  />
                </Field>
                <Field label={t.town} htmlFor="d-scity" error={errors["site.city"]}>
                  <Input
                    id="d-scity"
                    aria-invalid={!!errors["site.city"]}
                    value={d.site.city}
                    onChange={(e) => update({ site: { ...d.site, city: e.target.value } })}
                  />
                </Field>
                <Field label={t.province} htmlFor="d-sprov" error={errors["site.province"]}>
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
              <Field label={t.from} htmlFor="d-from" error={errors.from}>
                <Input
                  id="d-from"
                  type="date"
                  min={today()}
                  aria-invalid={!!errors.from}
                  value={d.from}
                  onChange={(e) => update({ from: e.target.value })}
                />
              </Field>
              <Field label={t.to} htmlFor="d-to" error={errors.to}>
                <Input
                  id="d-to"
                  type="date"
                  aria-invalid={!!errors.to}
                  value={d.to}
                  onChange={(e) => update({ to: e.target.value })}
                />
              </Field>
              <Field label={t.access} htmlFor="d-access">
                <Input
                  id="d-access"
                  placeholder={t.accessPh}
                  value={d.needs.accessWidth}
                  onChange={(e) => update({ needs: { ...d.needs, accessWidth: e.target.value } })}
                />
              </Field>
              <Field label={t.ground} htmlFor="d-ground">
                <Input
                  id="d-ground"
                  placeholder={t.groundPh}
                  value={d.needs.ground}
                  onChange={(e) => update({ needs: { ...d.needs, ground: e.target.value } })}
                />
              </Field>
              <Field label={t.schedule} htmlFor="d-sched">
                <Input
                  id="d-sched"
                  placeholder={t.schedulePh}
                  value={d.needs.schedule}
                  onChange={(e) => update({ needs: { ...d.needs, schedule: e.target.value } })}
                />
              </Field>
              <Field label={t.otherNeeds} htmlFor="d-notes">
                <Input
                  id="d-notes"
                  value={d.needs.notes}
                  onChange={(e) => update({ needs: { ...d.needs, notes: e.target.value } })}
                />
              </Field>
            </div>
            <Field label={t.job} htmlFor="d-job">
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
            <div className="eyebrow mb-1">{t.step3}</div>
            <h3>{t.draftTitle}</h3>
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
                    {send.isPending ? t.sending : t.send}
                  </Button>
                  <Button
                    variant="link"
                    className="mt-1.5 text-sm"
                    onClick={async () => {
                      if (
                        await confirm({
                          title: t.clearTitle,
                          body: t.clearBody,
                          confirmLabel: t.clear,
                          danger: true,
                        })
                      ) {
                        clearDraft()
                      }
                    }}
                  >
                    {t.clearRequest}
                  </Button>
                </>
              ) : (
                <>
                  <Alert tone="info" size="sm" className="mb-2.5" title={t.signInToSend}>
                    {t.savedHere}
                  </Alert>
                  <Link
                    href="/login?next=/request"
                    className={buttonVariants({ variant: "primary", block: true })}
                  >
                    {t.signInOrRegister}
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
  const t = useMessages(M)
  const { eur } = useFormat()
  const net = groups.reduce((s, g) => s + g.totals.net, 0)
  const missing = groups.reduce((s, g) => s + g.totals.missing, 0)
  return (
    <>
      {groups.map((g) => (
        <div key={g.partnerId} className="border-b py-2">
          <div className="flex justify-between gap-2">
            <b>{stripDemo(g.partnerName)}</b>
            <span>
              {eur(g.totals.net)} {!g.totals.complete && <Badge tone="warn">{t.partial}</Badge>}
            </span>
          </div>
          <ul className="text-muted-foreground m-0 list-none p-0">
            {g.lines.map((l, i) => (
              <li key={i}>
                {l.description}:{" "}
                {l.amount === null ? <Badge tone="warn">{t.toPrice}</Badge> : eur(l.amount)}
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
        <b>{t.estimatedNet}</b>
        <b>{eur(net)}</b>
      </div>
      <p className="text-muted-foreground mt-1">
        {t.exclVat} {missing > 0 && <b>{t.linesToPrice(missing)} </b>}
        {t.confirmedLater}
      </p>
      <p className="mt-1.5">{t.sentTo(<b>{groups.length}</b>, groups.length)}</p>
    </>
  )
}

function StepTitle({ n, title, hint }: { n: number; title: string; hint: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="bg-primary text-ink mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[0.95rem] font-bold">
        {n}
      </span>
      <div>
        <h2 className="mb-0.5 text-[1.4rem]">{title}</h2>
        <p className="text-muted-foreground m-0 text-sm">{hint}</p>
      </div>
    </div>
  )
}
