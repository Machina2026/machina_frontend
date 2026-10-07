"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { QueryView } from "@/components/app/query-view"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { api, ApiError } from "@/lib/machina/api"
import { localDateTime } from "@/lib/machina/format"
import { COMPANY_ROLE, COMPANY_TYPE } from "@/lib/machina/labels"
import type { AuthResponse, InvitationPreview } from "@/lib/machina/types"

import { AuthBrandPanel, useAfterSignIn } from "./auth"

function invitedAs(inv: InvitationPreview) {
  if (!inv.company) return "a Machina admin"
  const role = inv.companyRole ? COMPANY_ROLE[inv.companyRole].toLowerCase() : "member"
  return `${role} of ${inv.company.name} (${COMPANY_TYPE[inv.company.type].toLowerCase()})`
}

function AcceptForm({ token, inv }: { token: string; inv: InvitationPreview }) {
  const after = useAfterSignIn()
  const [form, setForm] = useState({ name: "", phone: "", password: "" })
  const accept = useMutation({
    mutationFn: () => api.post<AuthResponse>("/api/auth/invitations/accept", { token, ...form }),
    onSuccess: (r) => after(r.user),
  })
  const fields = accept.error instanceof ApiError ? accept.error.fields : {}
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        accept.mutate()
      }}
    >
      <p className="text-muted-foreground mb-6">
        You&apos;ve been invited to join Machina Rent as <b>{invitedAs(inv)}</b>, with the email{" "}
        <b>{inv.email}</b>. The invitation is valid until {localDateTime(inv.expiresAt)}.
      </p>
      <Field label="Your name" htmlFor="i-name" error={fields.name}>
        <Input
          id="i-name"
          autoComplete="name"
          required
          aria-invalid={!!fields.name}
          value={form.name}
          onChange={set("name")}
        />
      </Field>
      <Field label="Phone (optional)" htmlFor="i-phone" error={fields.phone}>
        <Input
          id="i-phone"
          type="tel"
          autoComplete="tel"
          aria-invalid={!!fields.phone}
          value={form.phone}
          onChange={set("phone")}
        />
      </Field>
      <Field
        label="Choose a password"
        htmlFor="i-pass"
        hint="At least 8 characters."
        error={
          fields.password ??
          (accept.isError && !Object.keys(fields).length ? accept.error.message : undefined)
        }
      >
        <Input
          id="i-pass"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={!!fields.password}
          value={form.password}
          onChange={set("password")}
        />
      </Field>
      <Button type="submit" variant="primary" size="lg" block disabled={accept.isPending}>
        {accept.isPending ? "Creating your account…" : "Create account and sign in"}{" "}
        <ArrowRight aria-hidden />
      </Button>
    </form>
  )
}

export function InviteView({ token }: { token: string }) {
  const preview = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => api.get<InvitationPreview>(`/api/auth/invitations/${encodeURIComponent(token)}`),
    retry: false,
  })
  return (
    <section className="border-border/70 bg-card shadow-lift grid overflow-hidden rounded-3xl border lg:grid-cols-[1fr_1.05fr]">
      <AuthBrandPanel
        kicker="You're invited"
        title={
          <>
            Join <span className="text-gradient">Machina Rent</span>
          </>
        }
        points={[
          "Create your account in one step",
          "Your email is already confirmed by the invitation",
          "Signed in straight away",
        ]}
      />
      <div className="p-6 sm:p-10 lg:p-12">
        <div className="eyebrow mb-2.5">Invitation</div>
        <h1 className="mb-1.5">Create your account</h1>
        {preview.isError ? (
          <>
            <p className="text-muted-foreground mb-6">
              {preview.error.message}. Ask the person who invited you for a new link.
            </p>
            <Link href="/login" className={buttonVariants({ variant: "default" })}>
              Go to sign-in
            </Link>
          </>
        ) : (
          <QueryView query={preview} rows={3}>
            {(inv) => <AcceptForm token={token} inv={inv} />}
          </QueryView>
        )}
      </div>
    </section>
  )
}
