"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm"
import { PageHead, Small } from "@/components/app/bits"
import { QueryView } from "@/components/app/query-view"
import { Button } from "@/components/ui/button"
import { Card, CardHead } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Modal, ModalActions } from "@/components/ui/modal"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { api, ApiError } from "@/lib/machina/api"
import { useCatalogText } from "@/i18n/catalog"
import { useMessages } from "@/i18n/client"
import { useCommon } from "@/i18n/common"
import { defineMessages } from "@/i18n/messages"
import { meKey, useMeta } from "@/lib/machina/hooks"
import type { Client, Site } from "@/lib/machina/types"

const companyKey = ["buyer", "company"]

const M = defineMessages({
  en: {
    title: "Company and sites",
    saved: "Details saved",
    siteDeleted: "Site deleted",
    companyDetails: "Company details",
    usedIn: "Used in requests and draft invoices.",
    companyName: "Company name",
    vat: "VAT number",
    sdi: "SDI code",
    address: "Address",
    town: "Town",
    province: "Province",
    pec: "Certified email (PEC)",
    email: "Email",
    phone: "Phone",
    saveDetails: "Save details",
    sites: "Sites",
    newSite: "New site",
    deleteTitle: "Delete the site?",
    deleteBody: "Requests already sent keep the address.",
    delete: "Delete",
    noSites: "No saved sites.",
    siteSaved: "Site saved",
    editSite: "Edit site",
    siteName: "Site name",
    notes: "Notes on access, hours, limits",
  },
  it: {
    title: "Azienda e cantieri",
    saved: "Dati salvati",
    siteDeleted: "Cantiere eliminato",
    companyDetails: "Dati aziendali",
    usedIn: "Usati nelle richieste e nelle bozze di fattura.",
    companyName: "Ragione sociale",
    vat: "Partita IVA",
    sdi: "Codice SDI",
    address: "Indirizzo",
    town: "Comune",
    province: "Provincia",
    pec: "PEC",
    email: "Email",
    phone: "Telefono",
    saveDetails: "Salva i dati",
    sites: "Cantieri",
    newSite: "Nuovo cantiere",
    deleteTitle: "Eliminare il cantiere?",
    deleteBody: "Le richieste già inviate mantengono l'indirizzo.",
    delete: "Elimina",
    noSites: "Nessun cantiere salvato.",
    siteSaved: "Cantiere salvato",
    editSite: "Modifica cantiere",
    siteName: "Nome del cantiere",
    notes: "Note su accesso, orari, vincoli",
  },
})

export function BuyerCompany() {
  const t = useMessages(M)
  const q = useQuery({
    queryKey: companyKey,
    queryFn: () => api.get<Client>("/api/client/company"),
  })
  return (
    <>
      <PageHead title={t.title} />
      <QueryView query={q}>{(c) => <CompanyForms company={c} />}</QueryView>
    </>
  )
}

type CompanyFields = Pick<
  Client,
  "name" | "vat" | "sdi" | "address" | "city" | "province" | "pec" | "email" | "phone"
>

function CompanyForms({ company }: { company: Client }) {
  const t = useMessages(M)
  const c = useCommon()
  const ct = useCatalogText()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const provinces = (useMeta().data?.provinces ?? []).map(
    (p) => [p.id, `${ct.province(p.id, p.name)} (${p.id})`] as const
  )
  const [f, setF] = useState<CompanyFields>({
    name: company.name,
    vat: company.vat,
    sdi: company.sdi,
    address: company.address,
    city: company.city,
    province: company.province,
    pec: company.pec,
    email: company.email,
    phone: company.phone,
  })
  const [editing, setEditing] = useState<Site | "new" | null>(null)
  const save = useMutation({
    mutationFn: () => api.put<Client>("/api/client/company", f),
    onSuccess: () => {
      toast.success(t.saved)
      void qc.invalidateQueries({ queryKey: companyKey })
      void qc.invalidateQueries({ queryKey: meKey })
    },
    onError: (err) => toast.error(err.message),
  })
  const del = useMutation({
    mutationFn: (id: string) => api.del(`/api/client/sites/${id}`),
    onSuccess: () => {
      toast.success(t.siteDeleted)
      void qc.invalidateQueries({ queryKey: companyKey })
    },
  })
  const errors = save.error instanceof ApiError ? save.error.fields : {}
  const text = (key: keyof CompanyFields, label: string, type = "text") => (
    <Field label={label} htmlFor={`co-${key}`} error={errors[key]}>
      <Input
        id={`co-${key}`}
        type={type}
        aria-invalid={!!errors[key]}
        value={f[key]}
        onChange={(e) => setF({ ...f, [key]: e.target.value })}
      />
    </Field>
  )

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Card>
        <h3>{t.companyDetails}</h3>
        <Small className="mb-3">{t.usedIn}</Small>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
        >
          {text("name", t.companyName)}
          <div className="grid gap-x-3.5 sm:grid-cols-2">
            {text("vat", t.vat)}
            {text("sdi", t.sdi)}
            {text("address", t.address)}
            {text("city", t.town)}
            <Field label={t.province} htmlFor="co-province" error={errors.province}>
              <Select
                id="co-province"
                value={f.province}
                onChange={(e) => setF({ ...f, province: e.target.value })}
                options={provinces}
              />
            </Field>
            {text("pec", t.pec, "email")}
            {text("email", t.email, "email")}
            {text("phone", t.phone, "tel")}
          </div>
          <Button type="submit" variant="primary" disabled={save.isPending}>
            {t.saveDetails}
          </Button>
        </form>
      </Card>
      <Card>
        <CardHead
          title={t.sites}
          actions={
            <Button size="sm" variant="primary" onClick={() => setEditing("new")}>
              {t.newSite}
            </Button>
          }
        />
        {company.sites.length ? (
          <div className="divide-y">
            {company.sites.map((s) => (
              <div key={s.id} className="flex flex-wrap items-start justify-between gap-3 py-2.5">
                <div>
                  <b>{s.name}</b>
                  <Small>
                    {s.address}, {s.city} ({s.province})
                  </Small>
                  {s.notes && <div className="text-sm">{s.notes}</div>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setEditing(s)}>
                    {c.edit}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={async () => {
                      const ok = await confirm({
                        title: t.deleteTitle,
                        body: t.deleteBody,
                        confirmLabel: t.delete,
                        danger: true,
                      })
                      if (ok) del.mutate(s.id)
                    }}
                  >
                    {t.delete}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Small>{t.noSites}</Small>
        )}
      </Card>
      {editing && (
        <SiteDialog
          site={editing === "new" ? null : editing}
          provinces={provinces}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function SiteDialog({
  site,
  provinces,
  onClose,
}: {
  site: Site | null
  provinces: (readonly [string, string])[]
  onClose: () => void
}) {
  const t = useMessages(M)
  const c = useCommon()
  const qc = useQueryClient()
  const [f, setF] = useState({
    name: site?.name ?? "",
    address: site?.address ?? "",
    city: site?.city ?? "",
    province: site?.province ?? "TO",
    notes: site?.notes ?? "",
  })
  const save = useMutation({
    mutationFn: () =>
      site ? api.put(`/api/client/sites/${site.id}`, f) : api.post("/api/client/sites", f),
    onSuccess: () => {
      toast.success(t.siteSaved)
      void qc.invalidateQueries({ queryKey: companyKey })
      onClose()
    },
  })
  const errors = save.error instanceof ApiError ? save.error.fields : {}
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={site ? t.editSite : t.newSite}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <Field label={t.siteName} htmlFor="st-name" error={errors.name}>
          <Input
            id="st-name"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </Field>
        <div className="grid gap-x-3.5 sm:grid-cols-2">
          <Field label={t.address} htmlFor="st-address" error={errors.address}>
            <Input
              id="st-address"
              value={f.address}
              onChange={(e) => setF({ ...f, address: e.target.value })}
            />
          </Field>
          <Field label={t.town} htmlFor="st-city" error={errors.city}>
            <Input
              id="st-city"
              value={f.city}
              onChange={(e) => setF({ ...f, city: e.target.value })}
            />
          </Field>
          <Field label={t.province} htmlFor="st-province" error={errors.province}>
            <Select
              id="st-province"
              value={f.province}
              onChange={(e) => setF({ ...f, province: e.target.value })}
              options={provinces}
            />
          </Field>
        </div>
        <Field label={t.notes} htmlFor="st-notes">
          <Textarea
            id="st-notes"
            rows={2}
            value={f.notes}
            onChange={(e) => setF({ ...f, notes: e.target.value })}
          />
        </Field>
        <ModalActions>
          <Button onClick={onClose}>{c.cancel}</Button>
          <Button type="submit" variant="primary" disabled={save.isPending}>
            {c.save}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}
