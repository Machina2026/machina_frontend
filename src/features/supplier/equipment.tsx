"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ImagePlus, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm"
import { Crumbs, PageHead, Small, TableWrap } from "@/components/app/bits"
import { SpecChips } from "@/components/app/model-image"
import { QueryView } from "@/components/app/query-view"
import { EmptyState } from "@/components/states/empty-state"
import { ErrorState } from "@/components/states/error-state"
import { LoadingState } from "@/components/states/loading-state"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardHead } from "@/components/ui/card"
import { Check, ChipCheck, Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { api, ApiError, downloadText, photoUrl, readUpload } from "@/lib/machina/api"
import { useCatalogText } from "@/i18n/catalog"
import { useFormat, useMessages } from "@/i18n/client"
import { useCommon } from "@/i18n/common"
import { defineMessages, plural } from "@/i18n/messages"
import { useMeta } from "@/lib/machina/hooks"
import { useLabels } from "@/lib/machina/labels"
import type {
  ImportPreview,
  MetaResponse,
  Offer,
  OperatorMode,
  PartnerOfferDetail,
  PartnerOffersResponse,
  PartnerProfile,
  PublicModel,
  TransportMode,
} from "@/lib/machina/types"
import { cn } from "@/lib/utils"

const M = defineMessages({
  en: {
    importCsv: "Import CSV",
    newMachine: "New machine",
    catalogTitle: "Equipment catalogue",
    catalogIntro: "Each row is one of your offers: model, prices, accessories and conditions.",
    machine: "Machine",
    category: "Category",
    pricePerDay: "Price/day",
    transport: "Transport",
    operator: "Operator",
    area: "Area",
    status: "Status",
    yourModel: "your model",
    photos: (n: number) => `${n} ${plural(n, "photo", "photos")}`,
    noPhotos: "no photos",
    published: "Published",
    notPublished: "Not published",
    noMachines: "You have no machines in the catalogue yet.",
    type: "Type",
    brand: "Brand",
    model: "Model",
    description: "Description",
    specsOf: (cat: string) => `Specifications (${cat})`,
    jobs: "Suitable jobs (one per line)",
    limits: "Limitations (one per line)",
    saved: "Machine saved",
    photosUploaded: "Photos uploaded",
    selectModel: "Select a catalogue model…",
    modelSection: "Model",
    catalogModel: "Catalogue model",
    newModel: "New model",
    sameModel:
      "The same model can be offered by several partners: your prices and conditions stay yours.",
    machinaSheet:
      "Model sheet managed by Machina: report corrections to the staff. You can add notes and photos specific to your machine.",
    pricesDuration: "Prices and duration (excl. VAT)",
    dailyPrice: "Daily price (€)",
    weeklyPrice: "Weekly price (€)",
    monthlyPrice: "Monthly price (€)",
    minRental: "Minimum rental (days)",
    hoursIncluded: "Hours included per day",
    overtime: "Overtime hour (€)",
    transportOperator: "Transport, operator, deposit",
    fixedRoundTrip: "Fixed round-trip rate",
    onQuote: "On quote",
    notAvailable: "Not available",
    transportPrice: "Round-trip transport price (€)",
    onlyFixed: "Only for a fixed rate",
    deposit: "Deposit (€, optional)",
    available: "Available",
    onRequest: "On request (on quote)",
    mandatory: "Mandatory (wet hire)",
    operatorPrice: "Operator price per day (€)",
    onlyAvailable: "Only when available",
    units: "Units available (indicative)",
    areaServed: "Area served",
    accessories: "Accessories",
    noAccNewModel:
      "No Machina catalogue accessories are linked to a new model yet. Accessory compatibility for new models will come in a later version.",
    selectModelFirst: "Select the model to see compatible accessories.",
    noAccForModel: "No Machina catalogue accessories are linked to this model.",
    offer: "Offer",
    accessory: "Accessory",
    included: "Included",
    perDayCol: "€/day",
    perWeekCol: "€/week",
    perMonthCol: "€/month",
    offerAcc: (name: string) => `Offer ${name}`,
    accIncluded: (name: string) => `${name} included`,
    accDaily: (name: string) => `${name} daily price`,
    accWeekly: (name: string) => `${name} weekly price`,
    conditionsNotes: "Conditions and notes",
    specificConditions: "Specific conditions (one per line)",
    internalNotes: "Internal notes on the machine (e.g. year, fit-out)",
    publishedInCatalog: "Published in the catalogue",
    availabilityNote: "Availability is never published: you always confirm it on each request.",
    photosTitle: "Photos",
    removePhoto: "Remove photo",
    removePhotoTitle: "Remove the photo?",
    removePhotoBody: "It will no longer be visible in the catalogue.",
    uploading: "Uploading…",
    addPhotos: "Add photos of this machine",
    photoHint: "JPG, PNG or WebP, up to 5 MB each. Customers see the first photo in the catalogue.",
    photosAfterSave: "You can add photos after saving the machine for the first time.",
    saveMachine: "Save machine",
    checkFields: "Some fields need attention: check the highlighted ones.",
    imported: (n: number, skipped: number) => `${n} machines imported, ${skipped} rows skipped`,
    importTitle: "Import machines from CSV",
    importIntro:
      "Upload a CSV file (separator ; or ,). You'll see a preview with every row validated before importing. Machines you already list get their prices updated.",
    downloadTemplate: "Download CSV template",
    csvFile: "CSV file",
    csvContent: "CSV content",
    csvPh: "Paste the CSV here or pick a file",
    previewValidate: "Preview and validate",
    loadExample: "Load example (with errors)",
    preview: "Preview",
    valid: (n: number) => `${n} valid`,
    withErrors: (n: number) => `${n} with errors`,
    row: "Row",
    action: "Action",
    result: "Result",
    importRows: (n: number) => `Import ${n} valid rows`,
    rowsSkipped: "Rows with errors are skipped.",
    pricingTitle: "Prices, accessories and terms",
    pricingIntro:
      "Update your price lists quickly. Changes apply to new requests: quotes already sent and orders don't change.",
    accessoriesListed: "Accessories listed",
    price: "Price",
    perDay: "/day",
    perWeek: "/week",
    changeAccessories: "To change the accessories, open the machine.",
    noAccessories: "No accessories listed.",
    offersUpdated: (n: number) => `${n} offers updated`,
    priceList: "Machine price list (excl. VAT)",
    roundTrip: "Round-trip transport",
    dailyPriceAria: "Daily price",
    weeklyPriceAria: "Weekly price",
    monthlyPriceAria: "Monthly price",
    transportPriceAria: "Transport price",
    savePriceList: "Save price list",
    termsSaved: "Terms saved",
    generalTerms: "General rental terms",
    termsHint: "Shown to customers in requests (free text)",
    saveTerms: "Save terms",
  },
  it: {
    importCsv: "Importa CSV",
    newMachine: "Nuova macchina",
    catalogTitle: "Catalogo macchine",
    catalogIntro: "Ogni riga è una delle tue offerte: modello, prezzi, accessori e condizioni.",
    machine: "Macchina",
    category: "Categoria",
    pricePerDay: "Prezzo/giorno",
    transport: "Trasporto",
    operator: "Operatore",
    area: "Zona",
    status: "Stato",
    yourModel: "tuo modello",
    photos: (n: number) => `${n} ${plural(n, "foto", "foto")}`,
    noPhotos: "nessuna foto",
    published: "Pubblicata",
    notPublished: "Non pubblicata",
    noMachines: "Non hai ancora macchine nel catalogo.",
    type: "Tipo",
    brand: "Marca",
    model: "Modello",
    description: "Descrizione",
    specsOf: (cat: string) => `Scheda tecnica (${cat})`,
    jobs: "Lavori adatti (uno per riga)",
    limits: "Limiti (uno per riga)",
    saved: "Macchina salvata",
    photosUploaded: "Foto caricate",
    selectModel: "Seleziona un modello del catalogo…",
    modelSection: "Modello",
    catalogModel: "Modello del catalogo",
    newModel: "Nuovo modello",
    sameModel:
      "Lo stesso modello può essere offerto da più noleggiatori: i tuoi prezzi e le tue condizioni restano tuoi.",
    machinaSheet:
      "Scheda del modello gestita da Machina: segnala le correzioni allo staff. Puoi aggiungere note e foto specifiche della tua macchina.",
    pricesDuration: "Prezzi e durata (IVA esclusa)",
    dailyPrice: "Prezzo giornaliero (€)",
    weeklyPrice: "Prezzo settimanale (€)",
    monthlyPrice: "Prezzo mensile (€)",
    minRental: "Noleggio minimo (giorni)",
    hoursIncluded: "Ore incluse al giorno",
    overtime: "Ora extra (€)",
    transportOperator: "Trasporto, operatore, cauzione",
    fixedRoundTrip: "Tariffa fissa andata e ritorno",
    onQuote: "Su preventivo",
    notAvailable: "Non disponibile",
    transportPrice: "Prezzo trasporto andata e ritorno (€)",
    onlyFixed: "Solo per tariffa fissa",
    deposit: "Cauzione (€, facoltativa)",
    available: "Disponibile",
    onRequest: "Su richiesta (su preventivo)",
    mandatory: "Obbligatorio (noleggio a caldo)",
    operatorPrice: "Prezzo operatore al giorno (€)",
    onlyAvailable: "Solo se disponibile",
    units: "Unità disponibili (indicative)",
    areaServed: "Zona servita",
    accessories: "Accessori",
    noAccNewModel:
      "Nessun accessorio del catalogo Machina è ancora collegato a un nuovo modello. La compatibilità degli accessori per i nuovi modelli arriverà in una versione successiva.",
    selectModelFirst: "Seleziona il modello per vedere gli accessori compatibili.",
    noAccForModel: "Nessun accessorio del catalogo Machina è collegato a questo modello.",
    offer: "Offri",
    accessory: "Accessorio",
    included: "Incluso",
    perDayCol: "€/giorno",
    perWeekCol: "€/settimana",
    perMonthCol: "€/mese",
    offerAcc: (name: string) => `Offri ${name}`,
    accIncluded: (name: string) => `${name} incluso`,
    accDaily: (name: string) => `Prezzo giornaliero ${name}`,
    accWeekly: (name: string) => `Prezzo settimanale ${name}`,
    conditionsNotes: "Condizioni e note",
    specificConditions: "Condizioni specifiche (una per riga)",
    internalNotes: "Note interne sulla macchina (es. anno, allestimento)",
    publishedInCatalog: "Pubblicata nel catalogo",
    availabilityNote:
      "La disponibilità non viene mai pubblicata: la confermi sempre su ogni richiesta.",
    photosTitle: "Foto",
    removePhoto: "Rimuovi la foto",
    removePhotoTitle: "Rimuovere la foto?",
    removePhotoBody: "Non sarà più visibile nel catalogo.",
    uploading: "Caricamento…",
    addPhotos: "Aggiungi foto di questa macchina",
    photoHint:
      "JPG, PNG o WebP, fino a 5 MB ciascuna. I clienti vedono la prima foto nel catalogo.",
    photosAfterSave: "Potrai aggiungere le foto dopo aver salvato la macchina la prima volta.",
    saveMachine: "Salva la macchina",
    checkFields: "Alcuni campi richiedono attenzione: controlla quelli evidenziati.",
    imported: (n: number, skipped: number) => `${n} macchine importate, ${skipped} righe saltate`,
    importTitle: "Importa macchine da CSV",
    importIntro:
      "Carica un file CSV (separatore ; o ,). Vedrai un'anteprima con ogni riga verificata prima dell'importazione. Le macchine che hai già in catalogo vengono aggiornate nei prezzi.",
    downloadTemplate: "Scarica il modello CSV",
    csvFile: "File CSV",
    csvContent: "Contenuto CSV",
    csvPh: "Incolla qui il CSV o scegli un file",
    previewValidate: "Anteprima e verifica",
    loadExample: "Carica un esempio (con errori)",
    preview: "Anteprima",
    valid: (n: number) => `${n} valide`,
    withErrors: (n: number) => `${n} con errori`,
    row: "Riga",
    action: "Azione",
    result: "Esito",
    importRows: (n: number) => `Importa ${n} righe valide`,
    rowsSkipped: "Le righe con errori vengono saltate.",
    pricingTitle: "Prezzi, accessori e condizioni",
    pricingIntro:
      "Aggiorna rapidamente i tuoi listini. Le modifiche valgono per le nuove richieste: preventivi già inviati e ordini non cambiano.",
    accessoriesListed: "Accessori offerti",
    price: "Prezzo",
    perDay: "/giorno",
    perWeek: "/settimana",
    changeAccessories: "Per cambiare gli accessori, apri la macchina.",
    noAccessories: "Nessun accessorio offerto.",
    offersUpdated: (n: number) => `${n} offerte aggiornate`,
    priceList: "Listino macchine (IVA esclusa)",
    roundTrip: "Trasporto andata e ritorno",
    dailyPriceAria: "Prezzo giornaliero",
    weeklyPriceAria: "Prezzo settimanale",
    monthlyPriceAria: "Prezzo mensile",
    transportPriceAria: "Prezzo del trasporto",
    savePriceList: "Salva il listino",
    termsSaved: "Condizioni salvate",
    generalTerms: "Condizioni generali di noleggio",
    termsHint: "Mostrate ai clienti nelle richieste (testo libero)",
    saveTerms: "Salva le condizioni",
  },
})

const offersKey = ["supplier", "offers"]
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v))

export function useSupplierOffers() {
  return useQuery({
    queryKey: offersKey,
    queryFn: () => api.get<PartnerOffersResponse>("/api/partner/offers"),
  })
}
export function useSupplierProfile() {
  return useQuery({
    queryKey: ["supplier", "profile"],
    queryFn: () => api.get<PartnerProfile>("/api/partner/profile"),
  })
}

// ----------------------------------------------------------------- list
export function EquipmentList() {
  const t = useMessages(M)
  const L = useLabels()
  const ct = useCatalogText()
  const { eur } = useFormat()
  const router = useRouter()
  const meta = useMeta().data
  const q = useSupplierOffers()
  const actions = (
    <>
      <Link href="/supplier/import" className={buttonVariants()}>
        {t.importCsv}
      </Link>
      <Link href="/supplier/equipment/new" className={buttonVariants({ variant: "primary" })}>
        {t.newMachine}
      </Link>
    </>
  )
  return (
    <>
      <PageHead title={t.catalogTitle} actions={actions}>
        {t.catalogIntro}
      </PageHead>
      <QueryView query={q}>
        {({ offers }) =>
          offers.length ? (
            <TableWrap>
              <thead>
                <tr>
                  <th>{t.machine}</th>
                  <th>{t.category}</th>
                  <th className="num">{t.pricePerDay}</th>
                  <th>{t.transport}</th>
                  <th>{t.operator}</th>
                  <th>{t.area}</th>
                  <th>{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <tr
                    key={o.id}
                    className="clickable"
                    onClick={() => router.push(`/supplier/equipment/${o.id}`)}
                  >
                    <td>
                      <Link
                        href={`/supplier/equipment/${o.id}`}
                        className="text-foreground font-semibold"
                      >
                        {o.model.brand} {o.model.model}
                      </Link>{" "}
                      {o.model.owner !== "machina" && <Badge>{t.yourModel}</Badge>}
                      <Small>
                        {o.photos.length ? t.photos(o.photos.length) : t.noPhotos}
                        {o.notes && ` · ${o.notes}`}
                      </Small>
                    </td>
                    <td>
                      {ct.category(
                        o.model.category,
                        meta?.categories.find((c) => c.id === o.model.category)?.name ?? ""
                      )}
                    </td>
                    <td className="num">{eur(o.prices.day)}</td>
                    <td>
                      {L.TRANSPORT_MODE[o.transport.mode]}
                      {o.transport.mode === "fixed" && ` ${eur(o.transport.price)}`}
                    </td>
                    <td>{L.OPERATOR_MODE[o.operator.mode]}</td>
                    <td>{o.zones.join(", ")}</td>
                    <td>
                      {o.active ? (
                        <Badge tone="ok">{t.published}</Badge>
                      ) : (
                        <Badge>{t.notPublished}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          ) : (
            <EmptyState title={t.noMachines} action={<div className="flex gap-2">{actions}</div>} />
          )
        }
      </QueryView>
    </>
  )
}

// --------------------------------------------------------------- editor
type ModelForm = {
  category: string
  subtype: string
  brand: string
  model: string
  description: string
  specs: Record<string, string>
  jobs: string
  limits: string
}
type AccForm = { on: boolean; included: boolean; day: string; week: string }
type OfferForm = {
  prices: { day: string; week: string; month: string }
  minDays: string
  hoursPerDay: string
  extraHourPrice: string
  deposit: string
  units: string
  transport: { mode: TransportMode; price: string }
  operator: { mode: OperatorMode; pricePerDay: string }
  zones: string[]
  accessories: Record<string, AccForm>
  conditions: string
  notes: string
  active: boolean
}

const toModelForm = (m?: Partial<PublicModel>): ModelForm => ({
  category: m?.category ?? "excavators",
  subtype: m?.subtype ?? "",
  brand: m?.brand ?? "",
  model: m?.model ?? "",
  description: m?.description ?? "",
  specs: Object.fromEntries(Object.entries(m?.specs ?? {}).map(([k, v]) => [k, str(v)])),
  jobs: (m?.jobs ?? []).join("\n"),
  limits: (m?.limits ?? []).join("\n"),
})

function toOfferForm(o: Offer | null, zones: string[]): OfferForm {
  return {
    prices: { day: str(o?.prices.day), week: str(o?.prices.week), month: str(o?.prices.month) },
    minDays: str(o?.minDays ?? 1),
    hoursPerDay: str(o?.hoursPerDay ?? 8),
    extraHourPrice: str(o?.extraHourPrice),
    deposit: str(o?.deposit),
    units: str(o?.units ?? 1),
    transport: { mode: o?.transport.mode ?? "fixed", price: str(o?.transport.price) },
    operator: {
      mode: o?.operator.mode ?? "unavailable",
      pricePerDay: str(o?.operator.pricePerDay),
    },
    zones: o?.zones ?? zones,
    accessories: Object.fromEntries(
      (o?.accessories ?? []).map((a) => [
        a.accessoryId,
        { on: true, included: Boolean(a.included), day: str(a.day), week: str(a.week) },
      ])
    ),
    conditions: (o?.conditions ?? []).join("\n"),
    notes: o?.notes ?? "",
    active: o?.active ?? true,
  }
}

function ModelFields({
  meta,
  value,
  onChange,
  errors,
  categoryFixed,
}: {
  meta: MetaResponse
  value: ModelForm
  onChange: (v: ModelForm) => void
  errors: Record<string, string>
  categoryFixed?: boolean
}) {
  const t = useMessages(M)
  const ct = useCatalogText()
  const cat = meta.categories.find((c) => c.id === value.category) ?? meta.categories[0]
  const specs = meta.specSchema[cat.id] ?? []
  const set = (patch: Partial<ModelForm>) => onChange({ ...value, ...patch })
  return (
    <>
      <div className="grid gap-x-3.5 sm:grid-cols-2">
        {categoryFixed ? (
          <Field label={t.category}>
            <div>{ct.category(cat.id, cat.name)}</div>
          </Field>
        ) : (
          <Field label={t.category} htmlFor="m-cat" error={errors["model.category"]}>
            <Select
              id="m-cat"
              value={value.category}
              onChange={(e) => set({ category: e.target.value, subtype: "" })}
              options={meta.categories.map((c) => [c.id, ct.category(c.id, c.name)] as const)}
            />
          </Field>
        )}
        <Field label={t.type} htmlFor="m-sub">
          <Select
            id="m-sub"
            value={value.subtype || cat.subtypes[0]}
            onChange={(e) => set({ subtype: e.target.value })}
            options={cat.subtypes.map((s) => [s, ct.subtype(s)] as const)}
          />
        </Field>
        <Field label={t.brand} htmlFor="m-brand" error={errors["model.brand"]}>
          <Input
            id="m-brand"
            value={value.brand}
            onChange={(e) => set({ brand: e.target.value })}
          />
        </Field>
        <Field label={t.model} htmlFor="m-model" error={errors["model.model"]}>
          <Input
            id="m-model"
            value={value.model}
            onChange={(e) => set({ model: e.target.value })}
          />
        </Field>
      </div>
      <Field label={t.description} htmlFor="m-desc" error={errors["model.description"]}>
        <Textarea
          id="m-desc"
          rows={2}
          value={value.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </Field>
      <h4 className="mb-2">{t.specsOf(ct.category(cat.id, cat.name))}</h4>
      <div className="grid gap-x-3.5 sm:grid-cols-2">
        {specs.map((s) => (
          <Field
            key={s.key}
            label={`${ct.spec(s.label)}${s.unit ? ` (${s.unit})` : ""}`}
            htmlFor={`m-spec-${s.key}`}
            error={errors[`model.specs.${s.key}`]}
          >
            <Input
              id={`m-spec-${s.key}`}
              type={s.type === "num" ? "number" : "text"}
              step="any"
              min={s.type === "num" ? 0 : undefined}
              value={value.specs[s.key] ?? ""}
              onChange={(e) => set({ specs: { ...value.specs, [s.key]: e.target.value } })}
            />
          </Field>
        ))}
      </div>
      <div className="grid gap-x-3.5 sm:grid-cols-2">
        <Field label={t.jobs} htmlFor="m-jobs">
          <Textarea
            id="m-jobs"
            value={value.jobs}
            onChange={(e) => set({ jobs: e.target.value })}
          />
        </Field>
        <Field label={t.limits} htmlFor="m-limits">
          <Textarea
            id="m-limits"
            value={value.limits}
            onChange={(e) => set({ limits: e.target.value })}
          />
        </Field>
      </div>
    </>
  )
}

export function EquipmentEditor({ id }: { id: string }) {
  const isNew = id === "new"
  const meta = useMeta()
  const list = useSupplierOffers()
  const profile = useSupplierProfile()
  const offer = useQuery({
    queryKey: ["supplier", "offer", id],
    queryFn: () => api.get<PartnerOfferDetail>(`/api/partner/offers/${id}`),
    enabled: !isNew,
  })
  const failed = [meta, list, profile, offer].find((q) => q.isError)
  if (failed)
    return <ErrorState description={failed.error?.message} onRetry={() => failed.refetch()} />
  if (!meta.isSuccess || !list.isSuccess || !profile.isSuccess || (!isNew && !offer.isSuccess))
    return <LoadingState />
  return (
    <EditorForm
      key={offer.data?.id ?? "new"}
      meta={meta.data}
      models={list.data.models}
      offer={offer.data ?? null}
      defaultZones={profile.data.zones}
    />
  )
}

function EditorForm({
  meta,
  models,
  offer,
  defaultZones,
}: {
  meta: MetaResponse
  models: PublicModel[]
  offer: PartnerOfferDetail | null
  defaultZones: string[]
}) {
  const t = useMessages(M)
  const c = useCommon()
  const ct = useCatalogText()
  const router = useRouter()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const isNew = !offer
  const m = offer?.model
  const ownModel = Boolean(m && m.owner !== "machina")
  const [mode, setMode] = useState<"existing" | "new">("existing")
  const [modelId, setModelId] = useState("")
  const [newModel, setNewModel] = useState(toModelForm())
  const [ownForm, setOwnForm] = useState(toModelForm(m))
  const [f, setF] = useState(() => toOfferForm(offer, defaultZones))
  const photoInput = useRef<HTMLInputElement>(null)

  const currentModelId = offer?.modelId ?? (mode === "existing" ? modelId : "")
  const compatible = meta.accessories.filter(
    (a) => currentModelId && a.compatibleModelIds.includes(currentModelId)
  )
  const set = (patch: Partial<OfferForm>) => setF({ ...f, ...patch })
  const setAcc = (aid: string, patch: Partial<AccForm>) =>
    set({
      accessories: {
        ...f.accessories,
        [aid]: {
          ...(f.accessories[aid] ?? { on: false, included: false, day: "", week: "" }),
          ...patch,
        },
      },
    })

  const modelPayload = (x: ModelForm) => ({
    ...x,
    subtype: x.subtype || meta.categories.find((c) => c.id === x.category)?.subtypes[0],
  })
  const save = useMutation({
    mutationFn: () => {
      const accessories = compatible
        .filter((a) => f.accessories[a.id]?.on)
        .map((a) => ({ accessoryId: a.id, ...f.accessories[a.id] }))
      const body: Record<string, unknown> = { ...f, accessories }
      if (isNew && mode === "existing") body.modelId = modelId
      if (isNew && mode === "new") body.newModel = modelPayload(newModel)
      if (!isNew && ownModel) body.model = modelPayload(ownForm)
      return isNew
        ? api.post<Offer>("/api/partner/offers", body)
        : api.put<Offer>(`/api/partner/offers/${offer.id}`, body)
    },
    onSuccess: (saved) => {
      toast.success(t.saved)
      void qc.invalidateQueries({ queryKey: ["supplier"] })
      if (isNew) router.push(`/supplier/equipment/${saved.id}`)
    },
    onError: (err) => toast.error(err.message),
  })
  const errors = save.error instanceof ApiError ? save.error.fields : {}
  // Accessory errors are indexed by position among the offered accessories.
  const accIndex = compatible.filter((a) => f.accessories[a.id]?.on).map((a) => a.id)

  const photos = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files)
        await api.post(`/api/partner/offers/${offer!.id}/photos`, { file: await readUpload(file) })
    },
    onSuccess: () => {
      toast.success(t.photosUploaded)
      void qc.invalidateQueries({ queryKey: ["supplier", "offer", offer!.id] })
    },
    onError: (err) => toast.error(err.message),
  })
  const removePhoto = useMutation({
    mutationFn: (fid: string) => api.del(`/api/partner/offers/${offer!.id}/photos/${fid}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["supplier", "offer", offer!.id] }),
  })

  const numField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    key: string,
    props: React.ComponentProps<typeof Input> = {}
  ) => (
    <Field label={label} htmlFor={`of-${key}`} error={errors[key]}>
      <Input
        id={`of-${key}`}
        type="number"
        min={0}
        step={0.01}
        aria-invalid={!!errors[key]}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </Field>
  )
  const title = isNew ? t.newMachine : `${m!.brand} ${m!.model}`
  const catName = (id: string) =>
    ct.category(id, meta.categories.find((x) => x.id === id)?.name ?? id)
  const modelOptions = [
    ["", t.selectModel] as const,
    ...[...models]
      .sort((a, b) => (a.category + a.brand).localeCompare(b.category + b.brand))
      .map((x) => [x.id, `${catName(x.category)} — ${x.brand} ${x.model}`] as const),
  ]

  return (
    <>
      <Crumbs items={[[t.catalogTitle, "/supplier/equipment"], [title]]} />
      <h1>{title}</h1>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <Card>
          <h3>{t.modelSection}</h3>
          {isNew ? (
            <>
              <div className="bg-muted mb-4 inline-flex gap-1 rounded-xl p-1" role="tablist">
                {(["existing", "new"] as const).map((x) => (
                  <button
                    key={x}
                    type="button"
                    role="tab"
                    aria-selected={mode === x}
                    onClick={() => setMode(x)}
                    className={cn(
                      "text-muted-foreground hover:text-foreground cursor-pointer rounded-lg px-3.5 py-2 text-[0.92rem]",
                      mode === x &&
                        "text-foreground bg-white font-semibold shadow-[0_1px_3px_rgb(20_18_14/0.12)]"
                    )}
                  >
                    {x === "existing" ? t.catalogModel : t.newModel}
                  </button>
                ))}
              </div>
              {mode === "existing" ? (
                <>
                  <Field label={t.model} htmlFor="of-model" error={errors.modelId}>
                    <Select
                      id="of-model"
                      value={modelId}
                      onChange={(e) => setModelId(e.target.value)}
                      options={modelOptions}
                    />
                  </Field>
                  <Small>{t.sameModel}</Small>
                </>
              ) : (
                <ModelFields meta={meta} value={newModel} onChange={setNewModel} errors={errors} />
              )}
            </>
          ) : ownModel ? (
            <ModelFields
              meta={meta}
              value={ownForm}
              onChange={setOwnForm}
              errors={errors}
              categoryFixed
            />
          ) : (
            <>
              <p>
                <b>
                  {m!.brand} {m!.model}
                </b>{" "}
                · {catName(m!.category)}
              </p>
              <SpecChips model={m!} max={8} />
              <Small>{t.machinaSheet}</Small>
            </>
          )}
        </Card>

        <Card>
          <h3>{t.pricesDuration}</h3>
          <div className="grid gap-x-3.5 sm:grid-cols-3">
            {numField(
              t.dailyPrice,
              f.prices.day,
              (v) => set({ prices: { ...f.prices, day: v } }),
              "prices.day",
              { min: 1 }
            )}
            {numField(
              t.weeklyPrice,
              f.prices.week,
              (v) => set({ prices: { ...f.prices, week: v } }),
              "prices.week",
              { min: 1 }
            )}
            {numField(
              t.monthlyPrice,
              f.prices.month,
              (v) => set({ prices: { ...f.prices, month: v } }),
              "prices.month",
              { min: 1 }
            )}
            {numField(t.minRental, f.minDays, (v) => set({ minDays: v }), "minDays", {
              min: 1,
              step: 1,
            })}
            {numField(
              t.hoursIncluded,
              f.hoursPerDay,
              (v) => set({ hoursPerDay: v }),
              "hoursPerDay",
              { min: 1, step: 0.5 }
            )}
            {numField(
              t.overtime,
              f.extraHourPrice,
              (v) => set({ extraHourPrice: v }),
              "extraHourPrice"
            )}
          </div>
        </Card>

        <Card>
          <h3>{t.transportOperator}</h3>
          <div className="grid gap-x-3.5 sm:grid-cols-3">
            <Field label={t.transport} htmlFor="of-tmode" error={errors["transport.mode"]}>
              <Select
                id="of-tmode"
                value={f.transport.mode}
                onChange={(e) =>
                  set({ transport: { ...f.transport, mode: e.target.value as TransportMode } })
                }
                options={[
                  ["fixed", t.fixedRoundTrip],
                  ["on_quote", t.onQuote],
                  ["unavailable", t.notAvailable],
                ]}
              />
            </Field>
            {numField(
              t.transportPrice,
              f.transport.price,
              (v) => set({ transport: { ...f.transport, price: v } }),
              "transport.price",
              {
                disabled: f.transport.mode !== "fixed",
                placeholder: f.transport.mode === "fixed" ? "" : t.onlyFixed,
              }
            )}
            {numField(t.deposit, f.deposit, (v) => set({ deposit: v }), "deposit")}
            <Field label={t.operator} htmlFor="of-omode" error={errors["operator.mode"]}>
              <Select
                id="of-omode"
                value={f.operator.mode}
                onChange={(e) =>
                  set({ operator: { ...f.operator, mode: e.target.value as OperatorMode } })
                }
                options={[
                  ["unavailable", t.notAvailable],
                  ["available", t.available],
                  ["on_quote", t.onRequest],
                  ["included", t.mandatory],
                ]}
              />
            </Field>
            {numField(
              t.operatorPrice,
              f.operator.pricePerDay,
              (v) => set({ operator: { ...f.operator, pricePerDay: v } }),
              "operator.pricePerDay",
              {
                disabled: f.operator.mode !== "available",
                placeholder: f.operator.mode === "available" ? "" : t.onlyAvailable,
              }
            )}
            {numField(t.units, f.units, (v) => set({ units: v }), "units", {
              min: 1,
              step: 1,
            })}
          </div>
        </Card>

        <Card>
          <h3>{t.areaServed}</h3>
          <Field label="" error={errors.zones} className="mb-0">
            <div className="flex flex-wrap gap-1.5">
              {meta.provinces.map((p) => (
                <ChipCheck
                  key={p.id}
                  label={ct.province(p.id, p.name)}
                  checked={f.zones.includes(p.id)}
                  onChange={(e) =>
                    set({
                      zones: e.target.checked
                        ? [...f.zones, p.id]
                        : f.zones.filter((z) => z !== p.id),
                    })
                  }
                />
              ))}
            </div>
          </Field>
        </Card>

        <Card>
          <h3>{t.accessories}</h3>
          {!currentModelId ? (
            <Small>{mode === "new" ? t.noAccNewModel : t.selectModelFirst}</Small>
          ) : compatible.length === 0 ? (
            <Small>{t.noAccForModel}</Small>
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <th>{t.offer}</th>
                  <th>{t.accessory}</th>
                  <th>{t.included}</th>
                  <th className="num">{t.perDayCol}</th>
                  <th className="num">{t.perWeekCol}</th>
                </tr>
              </thead>
              <tbody>
                {compatible.map((a) => {
                  const cur = f.accessories[a.id]
                  const i = accIndex.indexOf(a.id)
                  return (
                    <tr key={a.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={t.offerAcc(a.name)}
                          checked={Boolean(cur?.on)}
                          onChange={(e) => setAcc(a.id, { on: e.target.checked })}
                        />
                      </td>
                      <td>{a.name}</td>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={t.accIncluded(a.name)}
                          checked={Boolean(cur?.included)}
                          onChange={(e) => setAcc(a.id, { included: e.target.checked })}
                        />
                      </td>
                      <td className="w-[120px]">
                        <Input
                          aria-label={t.accDaily(a.name)}
                          type="number"
                          min={0}
                          step={0.01}
                          aria-invalid={i >= 0 && !!errors[`accessories.${i}.day`]}
                          value={cur?.day ?? ""}
                          onChange={(e) => setAcc(a.id, { day: e.target.value })}
                        />
                      </td>
                      <td className="w-[120px]">
                        <Input
                          aria-label={t.accWeekly(a.name)}
                          type="number"
                          min={0}
                          step={0.01}
                          value={cur?.week ?? ""}
                          onChange={(e) => setAcc(a.id, { week: e.target.value })}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </TableWrap>
          )}
        </Card>

        <Card>
          <h3>{t.conditionsNotes}</h3>
          <Field label={t.specificConditions} htmlFor="of-cond">
            <Textarea
              id="of-cond"
              value={f.conditions}
              onChange={(e) => set({ conditions: e.target.value })}
            />
          </Field>
          <Field label={t.internalNotes} htmlFor="of-notes">
            <Input id="of-notes" value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
          <Check
            label={t.publishedInCatalog}
            checked={f.active}
            onChange={(e) => set({ active: e.target.checked })}
          />
          <Small className="mt-2">{t.availabilityNote}</Small>
        </Card>

        {offer ? (
          <Card>
            <h3>{t.photosTitle}</h3>
            <div className="flex flex-wrap gap-2">
              {offer.photosMeta.map((p) => (
                <div key={p.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrl(p.id)}
                    alt=""
                    className="h-24 w-32 rounded border object-cover"
                  />
                  <Button
                    size="icon"
                    variant="danger"
                    aria-label={t.removePhoto}
                    className="absolute top-1 right-1 size-7"
                    onClick={async () => {
                      const ok = await confirm({
                        title: t.removePhotoTitle,
                        body: t.removePhotoBody,
                        confirmLabel: c.remove,
                        danger: true,
                      })
                      if (ok) removePhoto.mutate(p.id)
                    }}
                  >
                    <X />
                  </Button>
                </div>
              ))}
            </div>
            <label
              htmlFor="of-photos"
              className="border-border-strong bg-secondary hover:border-primary hover:bg-primary-soft focus-within:border-primary mt-3 flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors"
            >
              <ImagePlus aria-hidden className="text-brand size-7" />
              <span className="font-semibold">{photos.isPending ? t.uploading : t.addPhotos}</span>
              <span className="text-muted-foreground text-sm">{t.photoHint}</span>
              <input
                ref={photoInput}
                id="of-photos"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? [])
                  if (files.length) photos.mutate(files)
                  if (photoInput.current) photoInput.current.value = ""
                }}
              />
            </label>
          </Card>
        ) : (
          <Small>{t.photosAfterSave}</Small>
        )}

        <div className="border-border/80 shadow-lift sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-2 rounded-xl border bg-white/90 px-4 py-3 backdrop-blur">
          <Button type="submit" variant="primary" size="lg" disabled={save.isPending}>
            {save.isPending ? c.saving : t.saveMachine}
          </Button>
          <Link href="/supplier/equipment" className={buttonVariants({ size: "lg" })}>
            {c.cancel}
          </Link>
          {Object.keys(errors).length > 0 && (
            <span className="text-bad text-sm">{t.checkFields}</span>
          )}
        </div>
      </form>
    </>
  )
}

// --------------------------------------------------------------- import
const CSV_TEMPLATE =
  "category;subtype;brand;model;description;price_day;price_week;price_month;min_days;hours_per_day;transport;transport_price;operator;operator_price_day;deposit;weight_kg;width_mm;dig_depth_m;height_m;load_kg;power_kw;power_kva;conditions\n" +
  "excavators;Mini excavator;Kubota;KX019-4;Mini excavator 1.7 t;112;490;1450;1;8;fixed;120;unavailable;;500;1700;990;2.4;;;11;;Bucket included|Fuel excluded\n" +
  "platforms;Scissor lift;Haulotte;Compact 10;Electric scissor lift 10 m;75;300;850;1;8;fixed;100;unavailable;;;2400;810;;10;;;;\n" +
  "dumpers;Wheeled dumper;Ausa;D 350;Dumper 3.5 t;;420;1200;1;8;truck;;unavailable;;;;;;;;;;\n"

export function CsvImport() {
  const t = useMessages(M)
  const router = useRouter()
  const qc = useQueryClient()
  const [csv, setCsv] = useState("")
  const preview = useMutation({
    mutationFn: () => api.post<ImportPreview>("/api/partner/import/preview", { csv }),
    onError: (err) => toast.error(err.message),
  })
  const commit = useMutation({
    mutationFn: () =>
      api.post<{ imported: number; skipped: number }>("/api/partner/import/commit", { csv }),
    onSuccess: (r) => {
      toast.success(t.imported(r.imported, r.skipped))
      void qc.invalidateQueries({ queryKey: ["supplier"] })
      router.push("/supplier/equipment")
    },
    onError: (err) => toast.error(err.message),
  })
  const csvError = preview.error instanceof ApiError ? preview.error.fields.csv : undefined
  const p = preview.data

  return (
    <>
      <Crumbs items={[[t.catalogTitle, "/supplier/equipment"], [t.importCsv]]} />
      <h1>{t.importTitle}</h1>
      <p className="text-muted-foreground">{t.importIntro}</p>
      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Button
            onClick={() =>
              downloadText(
                "machina-import-template.csv",
                CSV_TEMPLATE.split("\n").slice(0, 2).join("\n") + "\n",
                "text/csv;charset=utf-8"
              )
            }
          >
            {t.downloadTemplate}
          </Button>
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label={t.csvFile}
            className="text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const r = new FileReader()
              r.onload = () => setCsv(String(r.result))
              r.readAsText(file, "utf-8")
            }}
          />
        </div>
        <Field label={t.csvContent} htmlFor="csv" error={csvError}>
          <Textarea
            id="csv"
            rows={8}
            className="font-mono text-sm"
            placeholder={t.csvPh}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" disabled={preview.isPending} onClick={() => preview.mutate()}>
            {t.previewValidate}
          </Button>
          <Button onClick={() => setCsv(CSV_TEMPLATE)}>{t.loadExample}</Button>
        </div>
      </Card>
      {p && (
        <Card className="mt-4">
          <CardHead
            title={t.preview}
            actions={
              <div className="flex gap-1.5">
                <Badge tone="ok">{t.valid(p.valid)}</Badge>
                <Badge tone="bad">{t.withErrors(p.invalid)}</Badge>
              </div>
            }
          />
          <TableWrap>
            <thead>
              <tr>
                <th>{t.row}</th>
                <th>{t.machine}</th>
                <th>{t.category}</th>
                <th className="num">{t.perDayCol}</th>
                <th>{t.action}</th>
                <th>{t.result}</th>
              </tr>
            </thead>
            <tbody>
              {p.rows.map((r) => (
                <tr key={r.line} className={cn(!r.valid && "to-confirm")}>
                  <td>{r.line}</td>
                  <td>
                    {r.data.brand || "?"} {r.data.model || "?"}
                  </td>
                  <td>{r.data.category}</td>
                  <td className="num">{r.data.price_day}</td>
                  <td className="text-sm">{r.action}</td>
                  <td className="text-sm">
                    {r.valid ? (
                      <Badge tone="ok">OK</Badge>
                    ) : (
                      Object.entries(r.errors).map(([k, v]) => (
                        <div key={k}>
                          <b>{k}</b>: {v}
                        </div>
                      ))
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              disabled={!p.valid || commit.isPending}
              onClick={() => commit.mutate()}
            >
              {t.importRows(p.valid)}
            </Button>
            <Small>{t.rowsSkipped}</Small>
          </div>
        </Card>
      )}
    </>
  )
}

// -------------------------------------------------------------- pricing
export function SupplierPricing() {
  const t = useMessages(M)
  const { eur } = useFormat()
  const offers = useSupplierOffers()
  const profile = useSupplierProfile()
  return (
    <>
      <PageHead title={t.pricingTitle}>{t.pricingIntro}</PageHead>
      <QueryView query={offers}>
        {(data) => (
          <>
            <PriceList
              key={data.offers.map((o) => `${o.id}:${o.prices.day}:${o.active}`).join()}
              data={data}
            />
            <Card className="mt-4">
              <h3>{t.accessoriesListed}</h3>
              {data.offers.some((o) => o.accessories.length) ? (
                <>
                  <TableWrap>
                    <thead>
                      <tr>
                        <th>{t.machine}</th>
                        <th>{t.accessory}</th>
                        <th className="num">{t.price}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.offers.flatMap((o) =>
                        o.accessories.map((a) => (
                          <tr key={`${o.id}-${a.accessoryId}`}>
                            <td>
                              {o.model.brand} {o.model.model}
                            </td>
                            <td>{o.accessoryNames[a.accessoryId] ?? a.accessoryId}</td>
                            <td className="num">
                              {a.included
                                ? t.included
                                : `${eur(a.day)}${t.perDay}${a.week ? ` · ${eur(a.week)}${t.perWeek}` : ""}`}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </TableWrap>
                  <Small className="mt-2">{t.changeAccessories}</Small>
                </>
              ) : (
                <Small>{t.noAccessories}</Small>
              )}
            </Card>
          </>
        )}
      </QueryView>
      <QueryView query={profile}>
        {(p) => <GeneralConditions key={p.conditions} profile={p} />}
      </QueryView>
    </>
  )
}

type PriceRow = {
  offerId: string
  day: string
  week: string
  month: string
  transport: string
  active: boolean
}

function PriceList({ data }: { data: PartnerOffersResponse }) {
  const t = useMessages(M)
  const L = useLabels()
  const qc = useQueryClient()
  const [rows, setRows] = useState<PriceRow[]>(
    data.offers.map((o) => ({
      offerId: o.id,
      day: str(o.prices.day),
      week: str(o.prices.week),
      month: str(o.prices.month),
      transport: str(o.transport.price),
      active: o.active,
    }))
  )
  const save = useMutation({
    mutationFn: () =>
      api.put<{ updated: number }>("/api/partner/prices", {
        rows: rows.map((r, i) => ({
          ...r,
          transport: data.offers[i].transport.mode === "fixed" ? r.transport : null,
        })),
      }),
    onSuccess: (r) => {
      toast.success(t.offersUpdated(r.updated))
      void qc.invalidateQueries({ queryKey: ["supplier"] })
    },
    onError: (err) => toast.error(err.message),
  })
  const errors = save.error instanceof ApiError ? save.error.fields : {}
  const setRow = (i: number, patch: Partial<PriceRow>) =>
    setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const cell = (i: number, key: "day" | "week" | "month" | "transport", label: string) => (
    <Input
      aria-label={label}
      type="number"
      min={key === "transport" ? 0 : 1}
      step={0.01}
      aria-invalid={!!errors[`${i}.${key}`]}
      title={errors[`${i}.${key}`]}
      value={rows[i][key]}
      onChange={(e) => setRow(i, { [key]: e.target.value })}
    />
  )
  return (
    <Card>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <h3>{t.priceList}</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="data-table min-w-[720px]">
            <thead>
              <tr>
                <th>{t.machine}</th>
                <th className="num">{t.perDayCol}</th>
                <th className="num">{t.perWeekCol}</th>
                <th className="num">{t.perMonthCol}</th>
                <th className="num">{t.roundTrip}</th>
                <th>{t.published}</th>
              </tr>
            </thead>
            <tbody>
              {data.offers.map((o, i) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/supplier/equipment/${o.id}`}>
                      {o.model.brand} {o.model.model}
                    </Link>
                  </td>
                  <td className="w-[120px]">{cell(i, "day", t.dailyPriceAria)}</td>
                  <td className="w-[120px]">{cell(i, "week", t.weeklyPriceAria)}</td>
                  <td className="w-[120px]">{cell(i, "month", t.monthlyPriceAria)}</td>
                  <td className="w-[140px]">
                    {o.transport.mode === "fixed" ? (
                      cell(i, "transport", t.transportPriceAria)
                    ) : (
                      <Small>{L.TRANSPORT_MODE[o.transport.mode]}</Small>
                    )}
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={t.published}
                      checked={rows[i].active}
                      onChange={(e) => setRow(i, { active: e.target.checked })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button type="submit" variant="primary" className="mt-3" disabled={save.isPending}>
          {t.savePriceList}
        </Button>
      </form>
    </Card>
  )
}

function GeneralConditions({ profile }: { profile: PartnerProfile }) {
  const t = useMessages(M)
  const qc = useQueryClient()
  const [conditions, setConditions] = useState(profile.conditions)
  const save = useMutation({
    mutationFn: () => api.put("/api/partner/profile", { ...profile, conditions }),
    onSuccess: () => {
      toast.success(t.termsSaved)
      void qc.invalidateQueries({ queryKey: ["supplier", "profile"] })
    },
    onError: (err) => toast.error(err.message),
  })
  return (
    <Card className="mt-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <h3>{t.generalTerms}</h3>
        <Field label={t.termsHint} htmlFor="gc">
          <Textarea
            id="gc"
            rows={5}
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
          />
        </Field>
        <Button type="submit" variant="primary" disabled={save.isPending}>
          {t.saveTerms}
        </Button>
      </form>
    </Card>
  )
}
