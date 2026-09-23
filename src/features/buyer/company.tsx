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
import { meKey, useMeta } from "@/lib/machina/hooks"
import type { Client, Site } from "@/lib/machina/types"

const companyKey = ["buyer", "company"]

export function BuyerCompany() {
  const q = useQuery({
    queryKey: companyKey,
    queryFn: () => api.get<Client>("/api/client/company"),
  })
  return (
    <>
      <PageHead title="Company and sites" />
      <QueryView query={q}>{(c) => <CompanyForms company={c} />}</QueryView>
    </>
  )
}

type CompanyFields = Pick<
  Client,
  "name" | "vat" | "sdi" | "address" | "city" | "province" | "pec" | "email" | "phone"
>

function CompanyForms({ company }: { company: Client }) {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const provinces = (useMeta().data?.provinces ?? []).map(
    (p) => [p.id, `${p.name} (${p.id})`] as const
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
      toast.success("Details saved")
      void qc.invalidateQueries({ queryKey: companyKey })
      void qc.invalidateQueries({ queryKey: meKey })
    },
    onError: (err) => toast.error(err.message),
  })
  const del = useMutation({
    mutationFn: (id: string) => api.del(`/api/client/sites/${id}`),
    onSuccess: () => {
      toast.success("Site deleted")
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
        <h3>Company details</h3>
        <Small className="mb-3">Used in requests and draft invoices.</Small>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
        >
          {text("name", "Company name")}
          <div className="grid gap-x-3.5 sm:grid-cols-2">
            {text("vat", "VAT number")}
            {text("sdi", "SDI code")}
            {text("address", "Address")}
            {text("city", "Town")}
            <Field label="Province" htmlFor="co-province" error={errors.province}>
              <Select
                id="co-province"
                value={f.province}
                onChange={(e) => setF({ ...f, province: e.target.value })}
                options={provinces}
              />
            </Field>
            {text("pec", "Certified email (PEC)", "email")}
            {text("email", "Email", "email")}
            {text("phone", "Phone", "tel")}
          </div>
          <Button type="submit" variant="primary" disabled={save.isPending}>
            Save details
          </Button>
        </form>
      </Card>
      <Card>
        <CardHead
          title="Sites"
          actions={
            <Button size="sm" variant="primary" onClick={() => setEditing("new")}>
              New site
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
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={async () => {
                      const ok = await confirm({
                        title: "Delete the site?",
                        body: "Requests already sent keep the address.",
                        confirmLabel: "Delete",
                        danger: true,
                      })
                      if (ok) del.mutate(s.id)
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Small>No saved sites.</Small>
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
      toast.success("Site saved")
      void qc.invalidateQueries({ queryKey: companyKey })
      onClose()
    },
  })
  const errors = save.error instanceof ApiError ? save.error.fields : {}
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={site ? "Edit site" : "New site"}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <Field label="Site name" htmlFor="st-name" error={errors.name}>
          <Input
            id="st-name"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </Field>
        <div className="grid gap-x-3.5 sm:grid-cols-2">
          <Field label="Address" htmlFor="st-address" error={errors.address}>
            <Input
              id="st-address"
              value={f.address}
              onChange={(e) => setF({ ...f, address: e.target.value })}
            />
          </Field>
          <Field label="Town" htmlFor="st-city" error={errors.city}>
            <Input
              id="st-city"
              value={f.city}
              onChange={(e) => setF({ ...f, city: e.target.value })}
            />
          </Field>
          <Field label="Province" htmlFor="st-province" error={errors.province}>
            <Select
              id="st-province"
              value={f.province}
              onChange={(e) => setF({ ...f, province: e.target.value })}
              options={provinces}
            />
          </Field>
        </div>
        <Field label="Notes on access, hours, limits" htmlFor="st-notes">
          <Textarea
            id="st-notes"
            rows={2}
            value={f.notes}
            onChange={(e) => setF({ ...f, notes: e.target.value })}
          />
        </Field>
        <ModalActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={save.isPending}>
            Save
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}
