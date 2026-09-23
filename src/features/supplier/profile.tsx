"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { PageHead, Small } from "@/components/app/bits"
import { QueryView } from "@/components/app/query-view"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChipCheck, Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { api, ApiError, downloadFile, readUpload } from "@/lib/machina/api"
import { dateTime, num } from "@/lib/machina/format"
import { meKey, useMeta } from "@/lib/machina/hooks"
import type { PartnerProfile } from "@/lib/machina/types"

import { useSupplierProfile } from "./equipment"

export function SupplierProfile() {
  const q = useSupplierProfile()
  return (
    <>
      <PageHead title="Company profile" />
      <QueryView query={q}>{(p) => <ProfileForms key={p.id} profile={p} />}</QueryView>
    </>
  )
}

type Fields = Pick<
  PartnerProfile,
  | "name"
  | "vat"
  | "pec"
  | "address"
  | "city"
  | "province"
  | "email"
  | "phone"
  | "conditions"
  | "zones"
>

function ProfileForms({ profile: p }: { profile: PartnerProfile }) {
  const qc = useQueryClient()
  const meta = useMeta().data
  const [f, setF] = useState<Fields>({
    name: p.name,
    vat: p.vat,
    pec: p.pec,
    address: p.address,
    city: p.city,
    province: p.province,
    email: p.email,
    phone: p.phone,
    conditions: p.conditions,
    zones: p.zones,
  })
  const save = useMutation({
    mutationFn: () => api.put("/api/partner/profile", f),
    onSuccess: () => {
      toast.success("Profile saved")
      void qc.invalidateQueries({ queryKey: ["supplier", "profile"] })
      void qc.invalidateQueries({ queryKey: meKey })
    },
    onError: (err) => toast.error(err.message),
  })
  const upload = useMutation({
    mutationFn: async (file: File) =>
      api.post("/api/partner/attachments", { file: await readUpload(file) }),
    onSuccess: () => {
      toast.success("PDF catalogue attached")
      void qc.invalidateQueries({ queryKey: ["supplier", "profile"] })
    },
    onError: (err) => toast.error(err.message),
  })
  const errors = save.error instanceof ApiError ? save.error.fields : {}
  const text = (
    key: Exclude<keyof Fields, "zones" | "conditions">,
    label: string,
    type = "text"
  ) => (
    <Field label={label} htmlFor={`pr-${key}`} error={errors[key]}>
      <Input
        id={`pr-${key}`}
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
        <h3>Company details and contacts</h3>
        {!p.verified && (
          <Alert tone="warn" size="sm" className="mb-3" title="Account being verified">
            Machina staff will verify the company details.
          </Alert>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
        >
          {text("name", "Company name")}
          <div className="grid gap-x-3.5 sm:grid-cols-2">
            {text("vat", "VAT number")}
            {text("pec", "Certified email (PEC)")}
            {text("address", "Registered address")}
            {text("city", "Town")}
            <Field label="Province" htmlFor="pr-province" error={errors.province}>
              <Select
                id="pr-province"
                value={f.province}
                onChange={(e) => setF({ ...f, province: e.target.value })}
                options={(meta?.provinces ?? []).map((x) => [x.id, `${x.name} (${x.id})`] as const)}
              />
            </Field>
            {text("email", "Email", "email")}
            {text("phone", "Phone", "tel")}
          </div>
          <Field label="Area served (default for new machines)" error={errors.zones}>
            <div className="flex flex-wrap gap-1.5">
              {(meta?.provinces ?? []).map((x) => (
                <ChipCheck
                  key={x.id}
                  label={x.name}
                  checked={f.zones.includes(x.id)}
                  onChange={(e) =>
                    setF({
                      ...f,
                      zones: e.target.checked
                        ? [...f.zones, x.id]
                        : f.zones.filter((z) => z !== x.id),
                    })
                  }
                />
              ))}
            </div>
          </Field>
          <Field label="General terms" htmlFor="pr-cond">
            <Textarea
              id="pr-cond"
              rows={4}
              value={f.conditions}
              onChange={(e) => setF({ ...f, conditions: e.target.value })}
            />
          </Field>
          <Button type="submit" variant="primary" disabled={save.isPending}>
            Save profile
          </Button>
        </form>
      </Card>
      <Card>
        <h3>PDF catalogue</h3>
        <Small className="mb-3">
          You can attach your catalogue as a PDF for reference.{" "}
          <b>Data is not extracted automatically</b>: machines have to be added by hand or imported
          from CSV.
        </Small>
        {p.attachmentsMeta.length ? (
          <div className="divide-y">
            {p.attachmentsMeta.map((file) => (
              <div key={file.id} className="flex items-center justify-between gap-2 py-2">
                <span>
                  {file.name}{" "}
                  <span className="text-muted-foreground text-sm">
                    {num(file.size / 1024, 0)} KB · {dateTime(file.createdAt)}
                  </span>
                </span>
                <Button
                  size="sm"
                  onClick={() =>
                    downloadFile(file.id, file.name).catch((err) => toast.error(err.message))
                  }
                >
                  Download
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <Small>No attachments.</Small>
        )}
        <Field label="Upload PDF (max 5 MB)" htmlFor="pr-pdf" className="mt-3 mb-0">
          <input
            id="pr-pdf"
            type="file"
            accept="application/pdf"
            className="text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) upload.mutate(file)
              e.target.value = ""
            }}
          />
        </Field>
      </Card>
    </div>
  )
}
