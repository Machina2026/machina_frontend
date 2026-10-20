"use client"

import { useMutation } from "@tanstack/react-query"
import { ArrowRight, Check as CheckIcon, HardHat, Warehouse } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { MachinePhoto } from "@/components/app/model-image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, ChipCheck, Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { areaForPath, canAccessArea, homePathForRole, safeNextPath } from "@/lib/auth/roles"
import { api, ApiError } from "@/lib/machina/api"
import { useCatalogText } from "@/i18n/catalog"
import { useMessages } from "@/i18n/client"
import { defineMessages } from "@/i18n/messages"
import { stripDemo } from "@/lib/machina/format"
import { useMeta, useResetSessionData } from "@/lib/machina/hooks"
import type { AuthResponse, Role, SessionUser } from "@/lib/machina/types"
import { cn } from "@/lib/utils"

const M = defineMessages({
  en: {
    loginKicker: "One account, every quote",
    loginTitle: (brand: React.ReactNode) => <>Welcome back to {brand}</>,
    loginPoints: [
      "Requests, quotes and orders for all your sites",
      "Extensions and charges only with your approval",
      "Draft invoices and documents in one place",
    ],
    signIn: "Sign in",
    goodToSeeYou: "Good to see you",
    signInIntro: "Sign in with your company account.",
    email: "Email",
    emailPh: "name@company.it",
    password: "Password",
    signingIn: "Signing in…",
    newCustomer: "New customer?",
    registerCompany: "Register your company",
    rentalCompany: "Rental company?",
    registerPartner: "Register as a partner",
    received: "Registration received",
    receivedBody: (company: React.ReactNode, email: React.ReactNode) => (
      <>
        Thank you. Machina checks every rental company before it can use the platform. We will
        review {company} and write to {email} once it is approved. You can sign in from then on.
      </>
    ),
    backHome: "Back to the home page",
    created: "Account created",
    partnerKicker: "For rental companies",
    clientKicker: "For construction companies",
    partnerTitle: (hl: (s: string) => React.ReactNode) => (
      <>Publish your fleet, {hl("receive ready requests")}</>
    ),
    clientTitle: (hl: (s: string) => React.ReactNode) => <>One account for {hl("every site")}</>,
    partnerPoints: [
      "Requests arrive with site, dates and needs",
      "You confirm availability and price per line",
      "Orders, changes and documents tracked",
    ],
    clientPoints: [
      "Compare several rental companies at once",
      "Price locked when you accept a quote",
      "All your sites, orders and invoices together",
    ],
    tabClient: "Construction company (customer)",
    tabPartner: "Rental company (partner)",
    partnerRegistration: "Rental company registration",
    clientRegistration: "Company registration",
    notVerified:
      "In this version company details are not verified automatically: production will need VAT number and contact verification.",
    companyDetails: "Company details",
    companyName: "Company name",
    vat: "VAT number",
    vatPh: "11 digits",
    address: "Registered address",
    town: "Town",
    province: "Province",
    pec: "Certified email (PEC)",
    sdi: "SDI recipient code",
    zones: "Area served (provinces)",
    contact: "Contact and sign-in",
    fullName: "Full name",
    phone: "Phone",
    signInEmail: "Sign-in email",
    newPassword: "Password (min. 8 characters)",
    acceptTerms:
      "I act on behalf of the company above and accept the terms of use (text to be defined).",
    creating: "Creating…",
    create: "Create account",
  },
  it: {
    loginKicker: "Un account, tutti i preventivi",
    loginTitle: (brand: React.ReactNode) => <>Bentornato su {brand}</>,
    loginPoints: [
      "Richieste, preventivi e ordini di tutti i tuoi cantieri",
      "Proroghe e addebiti solo con la tua approvazione",
      "Bozze di fattura e documenti in un unico posto",
    ],
    signIn: "Accedi",
    goodToSeeYou: "Che piacere rivederti",
    signInIntro: "Accedi con l'account della tua azienda.",
    email: "Email",
    emailPh: "nome@azienda.it",
    password: "Password",
    signingIn: "Accesso in corso…",
    newCustomer: "Nuovo cliente?",
    registerCompany: "Registra la tua azienda",
    rentalCompany: "Sei un noleggiatore?",
    registerPartner: "Registrati come partner",
    received: "Registrazione ricevuta",
    receivedBody: (company: React.ReactNode, email: React.ReactNode) => (
      <>
        Grazie. Machina verifica ogni noleggiatore prima che possa usare la piattaforma.
        Controlleremo {company} e scriveremo a {email} quando sarà approvata. Da quel momento potrai
        accedere.
      </>
    ),
    backHome: "Torna alla home page",
    created: "Account creato",
    partnerKicker: "Per i noleggiatori",
    clientKicker: "Per le imprese edili",
    partnerTitle: (hl: (s: string) => React.ReactNode) => (
      <>Pubblica la tua flotta, {hl("ricevi richieste già complete")}</>
    ),
    clientTitle: (hl: (s: string) => React.ReactNode) => <>Un account per {hl("ogni cantiere")}</>,
    partnerPoints: [
      "Le richieste arrivano con cantiere, date ed esigenze",
      "Confermi disponibilità e prezzo riga per riga",
      "Ordini, modifiche e documenti tracciati",
    ],
    clientPoints: [
      "Confronta più noleggiatori in una volta",
      "Prezzo bloccato quando accetti un preventivo",
      "Tutti i tuoi cantieri, ordini e fatture insieme",
    ],
    tabClient: "Impresa edile (cliente)",
    tabPartner: "Azienda di noleggio (partner)",
    partnerRegistration: "Registrazione noleggiatore",
    clientRegistration: "Registrazione azienda",
    notVerified:
      "In questa versione i dati aziendali non sono verificati automaticamente: in produzione servirà la verifica di partita IVA e contatti.",
    companyDetails: "Dati aziendali",
    companyName: "Ragione sociale",
    vat: "Partita IVA",
    vatPh: "11 cifre",
    address: "Sede legale",
    town: "Comune",
    province: "Provincia",
    pec: "PEC",
    sdi: "Codice destinatario SDI",
    zones: "Zona servita (province)",
    contact: "Referente e accesso",
    fullName: "Nome e cognome",
    phone: "Telefono",
    signInEmail: "Email di accesso",
    newPassword: "Password (min. 8 caratteri)",
    acceptTerms:
      "Agisco per conto dell'azienda indicata e accetto le condizioni d'uso (testo da definire).",
    creating: "Creazione in corso…",
    create: "Crea account",
  },
})

const highlight = (s: string) => <span className="text-primary">{s}</span>

/** After sign-in: go to `next` when this role may open it, otherwise to the role's area. */
export function useAfterSignIn(next?: string | null) {
  const router = useRouter()
  const reset = useResetSessionData()
  return async (user: SessionUser, fallback?: string) => {
    await reset()
    const safe = safeNextPath(next)
    const area = safe ? areaForPath(safe) : null
    const target =
      safe && (!area || canAccessArea(user.role, area))
        ? safe
        : (fallback ?? homePathForRole(user.role))
    router.push(target)
    router.refresh()
  }
}

export function LoginView({ next }: { next?: string }) {
  const t = useMessages(M)
  const after = useAfterSignIn(next)
  const [form, setForm] = useState({ email: "", password: "" })
  const login = useMutation({
    mutationFn: () => api.post<AuthResponse>("/api/auth/login", form),
    onSuccess: (r) => after(r.user),
  })

  return (
    <section className="border-border bg-card shadow-lift grid overflow-hidden rounded-2xl border lg:grid-cols-[1fr_1.05fr]">
      <AuthBrandPanel
        kicker={t.loginKicker}
        title={t.loginTitle(highlight("Machina Rent"))}
        points={t.loginPoints}
      />
      <div className="p-6 sm:p-10 lg:p-12">
        <div className="eyebrow mb-2.5">{t.signIn}</div>
        <h1 className="mb-1.5">{t.goodToSeeYou}</h1>
        <p className="text-muted-foreground mb-7">{t.signInIntro}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            login.mutate()
          }}
        >
          <Field label={t.email} htmlFor="l-email">
            <Input
              id="l-email"
              type="email"
              autoComplete="username"
              placeholder={t.emailPh}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label={t.password} htmlFor="l-pass" error={login.error?.message}>
            <Input
              id="l-pass"
              type="password"
              autoComplete="current-password"
              aria-invalid={login.isError}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <Button type="submit" variant="primary" size="lg" block disabled={login.isPending}>
            {login.isPending ? t.signingIn : t.signIn} <ArrowRight aria-hidden />
          </Button>
        </form>
        <div className="border-border mt-7 grid gap-2 border-t pt-6 text-sm sm:grid-cols-2">
          <Link
            href="/register?role=client"
            className="border-border/80 hover:border-primary/40 hover:bg-primary-soft/40 text-foreground flex items-center gap-2.5 rounded-xl border px-3.5 py-3 no-underline hover:no-underline"
          >
            <HardHat aria-hidden className="text-brand size-4" />
            <span>
              <b className="block">{t.newCustomer}</b>
              <span className="text-muted-foreground">{t.registerCompany}</span>
            </span>
          </Link>
          <Link
            href="/register?role=partner"
            className="border-border/80 hover:border-primary/40 hover:bg-primary-soft/40 text-foreground flex items-center gap-2.5 rounded-xl border px-3.5 py-3 no-underline hover:no-underline"
          >
            <Warehouse aria-hidden className="text-brand size-4" />
            <span>
              <b className="block">{t.rentalCompany}</b>
              <span className="text-muted-foreground">{t.registerPartner}</span>
            </span>
          </Link>
        </div>
      </div>
    </section>
  )
}

/** Dark left panel of the sign-in and registration pages. */
export function AuthBrandPanel({
  kicker,
  title,
  points,
}: {
  kicker: string
  title: React.ReactNode
  points: string[]
}) {
  return (
    <div className="bg-ink relative flex min-h-[360px] flex-col overflow-hidden p-8 text-white sm:p-10">
      <MachinePhoto src="/img/telehandler.png" alt="" sizes="(min-width: 1024px) 600px, 100vw" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/90 via-black/70 to-black/30"
      />
      <div className="relative">
        <p className="text-primary m-0 text-[0.95rem] font-semibold">{kicker}</p>
        <p className="mt-3 mb-5 text-[2rem] leading-tight font-bold tracking-[-0.03em] text-white">
          {title}
        </p>
        <ul className="m-0 grid list-none gap-2.5 p-0">
          {points.map((t) => (
            <li key={t} className="flex items-center gap-2.5 text-[0.95rem] text-white/90">
              <span className="bg-primary text-ink inline-flex size-6 shrink-0 items-center justify-center rounded-full">
                <CheckIcon aria-hidden className="size-3.5" />
              </span>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

type RegisterForm = {
  companyName: string
  vat: string
  address: string
  city: string
  province: string
  pec: string
  sdi: string
  zones: string[]
  name: string
  phone: string
  email: string
  password: string
  acceptTerms: boolean
}

/** Shown instead of the form when a partner has registered: they wait for Machina's approval. */
function RegistrationPending({ company, email }: { company: string; email: string }) {
  const t = useMessages(M)
  return (
    <Card className="mx-auto max-w-xl text-center">
      <span className="bg-primary-soft text-brand mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-full">
        <CheckIcon aria-hidden className="size-6" />
      </span>
      <h1 className="mb-2">{t.received}</h1>
      <p className="text-muted-foreground">
        {t.receivedBody(
          <b className="text-foreground">{stripDemo(company)}</b>,
          <b className="text-foreground">{email}</b>
        )}
      </p>
      <Link href="/" className="mt-4 inline-block">
        {t.backHome}
      </Link>
    </Card>
  )
}

export function RegisterView({ role }: { role: Role }) {
  const t = useMessages(M)
  const ct = useCatalogText()
  const meta = useMeta().data
  const after = useAfterSignIn()
  const [pending, setPending] = useState<{ company: string; email: string } | null>(null)
  const [f, setF] = useState<RegisterForm>({
    companyName: "",
    vat: "",
    address: "",
    city: "",
    province: "TO",
    pec: "",
    sdi: "",
    zones: ["TO"],
    name: "",
    phone: "",
    email: "",
    password: "",
    acceptTerms: false,
  })
  const reg = useMutation({
    mutationFn: () => api.post<AuthResponse>("/api/auth/register", { ...f, role }),
    onSuccess: (r) => {
      if (r.pending) {
        setPending({ company: r.org?.name ?? f.companyName, email: r.user.email })
        window.scrollTo({ top: 0 })
        return
      }
      toast.success(t.created)
      void after(r.user, role === "partner" ? "/supplier/equipment" : "/buyer/company")
    },
    onError: (err) => toast.error(err.message),
  })
  const errors = reg.error instanceof ApiError ? reg.error.fields : {}
  const text = (
    key: keyof RegisterForm,
    label: string,
    props: React.ComponentProps<typeof Input> = {}
  ) => (
    <Field label={label} htmlFor={`r-${key}`} error={errors[key]}>
      <Input
        id={`r-${key}`}
        aria-invalid={!!errors[key]}
        value={f[key] as string}
        onChange={(e) => setF({ ...f, [key]: e.target.value })}
        {...props}
      />
    </Field>
  )

  if (pending) return <RegistrationPending {...pending} />

  return (
    <section className="border-border bg-card shadow-lift grid overflow-hidden rounded-2xl border lg:grid-cols-[0.8fr_1.2fr]">
      <AuthBrandPanel
        kicker={role === "partner" ? t.partnerKicker : t.clientKicker}
        title={role === "partner" ? t.partnerTitle(highlight) : t.clientTitle(highlight)}
        points={role === "partner" ? t.partnerPoints : t.clientPoints}
      />
      <div className="p-6 sm:p-10">
        <div className="bg-muted mb-6 inline-flex gap-1 rounded-xl p-1" role="tablist">
          {(["client", "partner"] as const).map((r) => (
            <Link
              key={r}
              href={`/register?role=${r}`}
              role="tab"
              aria-selected={r === role}
              className={cn(
                "text-muted-foreground rounded-lg px-3.5 py-2 text-[0.9rem] no-underline hover:no-underline",
                r === role &&
                  "text-foreground bg-white font-semibold shadow-[0_1px_3px_rgb(20_18_14/0.12)]"
              )}
            >
              {r === "client" ? t.tabClient : t.tabPartner}
            </Link>
          ))}
        </div>
        <h1>{role === "partner" ? t.partnerRegistration : t.clientRegistration}</h1>
        <p className="text-muted-foreground text-sm">{t.notVerified}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            reg.mutate()
          }}
        >
          <h3>{t.companyDetails}</h3>
          <div className="grid gap-x-3.5 sm:grid-cols-2">
            {text("companyName", t.companyName)}
            {text("vat", t.vat, { inputMode: "numeric", placeholder: t.vatPh })}
            {text("address", t.address)}
            {text("city", t.town)}
            <Field label={t.province} htmlFor="r-province" error={errors.province}>
              <Select
                id="r-province"
                value={f.province}
                onChange={(e) => setF({ ...f, province: e.target.value })}
                options={(meta?.provinces ?? []).map(
                  (p) => [p.id, `${ct.province(p.id, p.name)} (${p.id})`] as const
                )}
              />
            </Field>
            {text("pec", t.pec, { type: "email" })}
            {role === "client" && text("sdi", t.sdi, { maxLength: 7 })}
          </div>
          {role === "partner" && (
            <Field label={t.zones} error={errors.zones}>
              <div className="flex flex-wrap gap-1.5">
                {(meta?.provinces ?? []).map((p) => (
                  <ChipCheck
                    key={p.id}
                    label={ct.province(p.id, p.name)}
                    checked={f.zones.includes(p.id)}
                    onChange={(e) =>
                      setF({
                        ...f,
                        zones: e.target.checked
                          ? [...f.zones, p.id]
                          : f.zones.filter((z) => z !== p.id),
                      })
                    }
                  />
                ))}
              </div>
            </Field>
          )}
          <h3>{t.contact}</h3>
          <div className="grid gap-x-3.5 sm:grid-cols-2">
            {text("name", t.fullName)}
            {text("phone", t.phone, { type: "tel" })}
            {text("email", t.signInEmail, { type: "email", autoComplete: "username" })}
            {text("password", t.newPassword, {
              type: "password",
              autoComplete: "new-password",
            })}
          </div>
          <Field label="" error={errors.acceptTerms}>
            <Check
              checked={f.acceptTerms}
              onChange={(e) => setF({ ...f, acceptTerms: e.target.checked })}
              label={t.acceptTerms}
            />
          </Field>
          <Button type="submit" variant="primary" size="lg" disabled={reg.isPending}>
            {reg.isPending ? t.creating : t.create}
          </Button>
        </form>
      </div>
    </section>
  )
}
