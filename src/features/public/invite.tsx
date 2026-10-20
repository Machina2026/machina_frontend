"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { QueryView } from "@/components/app/query-view"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useFormat, useMessages } from "@/i18n/client"
import { defineMessages } from "@/i18n/messages"
import { api, ApiError } from "@/lib/machina/api"
import { useLabels } from "@/lib/machina/labels"
import type { AuthResponse, InvitationPreview } from "@/lib/machina/types"

import { AuthBrandPanel, useAfterSignIn } from "./auth"

const M = defineMessages({
  en: {
    admin: "a Machina admin",
    member: "member",
    roleOf: (role: string, company: string, type: string) => `${role} of ${company} (${type})`,
    invited: (as: React.ReactNode, email: React.ReactNode, until: string) => (
      <>
        You&apos;ve been invited to join Machina Rent as {as}, with the email {email}. The
        invitation is valid until {until}.
      </>
    ),
    yourName: "Your name",
    phone: "Phone (optional)",
    password: "Choose a password",
    passwordHint: "At least 8 characters.",
    creating: "Creating your account…",
    create: "Create account and sign in",
    kicker: "You're invited",
    title: (brand: React.ReactNode) => <>Join {brand}</>,
    points: [
      "Create your account in one step",
      "Your email is already confirmed by the invitation",
      "Signed in straight away",
    ],
    eyebrow: "Invitation",
    heading: "Create your account",
    askNewLink: "Ask the person who invited you for a new link.",
    goSignIn: "Go to sign-in",
  },
  it: {
    admin: "amministratore Machina",
    member: "membro",
    roleOf: (role: string, company: string, type: string) => `${role} di ${company} (${type})`,
    invited: (as: React.ReactNode, email: React.ReactNode, until: string) => (
      <>
        Sei stato invitato su Machina Rent come {as}, con l&apos;email {email}. L&apos;invito è
        valido fino al {until}.
      </>
    ),
    yourName: "Il tuo nome",
    phone: "Telefono (facoltativo)",
    password: "Scegli una password",
    passwordHint: "Almeno 8 caratteri.",
    creating: "Creazione dell'account…",
    create: "Crea l'account e accedi",
    kicker: "Sei stato invitato",
    title: (brand: React.ReactNode) => <>Entra in {brand}</>,
    points: [
      "Crea il tuo account in un solo passaggio",
      "La tua email è già confermata dall'invito",
      "Accesso immediato",
    ],
    eyebrow: "Invito",
    heading: "Crea il tuo account",
    askNewLink: "Chiedi un nuovo link a chi ti ha invitato.",
    goSignIn: "Vai all'accesso",
  },
})

function AcceptForm({ token, inv }: { token: string; inv: InvitationPreview }) {
  const t = useMessages(M)
  const L = useLabels()
  const { localDateTime } = useFormat()
  const after = useAfterSignIn()
  const [form, setForm] = useState({ name: "", phone: "", password: "" })
  const accept = useMutation({
    mutationFn: () => api.post<AuthResponse>("/api/auth/invitations/accept", { token, ...form }),
    onSuccess: (r) => after(r.user),
  })
  const fields = accept.error instanceof ApiError ? accept.error.fields : {}
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value })

  const invitedAs = !inv.company
    ? t.admin
    : t.roleOf(
        inv.companyRole ? L.COMPANY_ROLE[inv.companyRole].toLowerCase() : t.member,
        inv.company.name,
        L.COMPANY_TYPE[inv.company.type].toLowerCase()
      )

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        accept.mutate()
      }}
    >
      <p className="text-muted-foreground mb-6">
        {t.invited(<b>{invitedAs}</b>, <b>{inv.email}</b>, localDateTime(inv.expiresAt))}
      </p>
      <Field label={t.yourName} htmlFor="i-name" error={fields.name}>
        <Input
          id="i-name"
          autoComplete="name"
          required
          aria-invalid={!!fields.name}
          value={form.name}
          onChange={set("name")}
        />
      </Field>
      <Field label={t.phone} htmlFor="i-phone" error={fields.phone}>
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
        label={t.password}
        htmlFor="i-pass"
        hint={t.passwordHint}
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
        {accept.isPending ? t.creating : t.create} <ArrowRight aria-hidden />
      </Button>
    </form>
  )
}

export function InviteView({ token }: { token: string }) {
  const t = useMessages(M)
  const preview = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => api.get<InvitationPreview>(`/api/auth/invitations/${encodeURIComponent(token)}`),
    retry: false,
  })
  return (
    <section className="border-border bg-card shadow-lift grid overflow-hidden rounded-2xl border lg:grid-cols-[1fr_1.05fr]">
      <AuthBrandPanel
        kicker={t.kicker}
        title={t.title(<span className="text-primary">Machina Rent</span>)}
        points={t.points}
      />
      <div className="p-6 sm:p-10 lg:p-12">
        <div className="eyebrow mb-2.5">{t.eyebrow}</div>
        <h1 className="mb-1.5">{t.heading}</h1>
        {preview.isError ? (
          <>
            <p className="text-muted-foreground mb-6">
              {preview.error.message}. {t.askNewLink}
            </p>
            <Link href="/login" className={buttonVariants({ variant: "default" })}>
              {t.goSignIn}
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
