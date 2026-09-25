"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { ArrowRight, Check as CheckIcon, HardHat, Warehouse } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { DemoBadge, Small } from "@/components/app/bits"
import { QueryView } from "@/components/app/query-view"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, ChipCheck, Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { areaForPath, canAccessArea, homePathForRole, safeNextPath } from "@/lib/auth/roles"
import { api, ApiError } from "@/lib/machina/api"
import { stripDemo } from "@/lib/machina/format"
import { useMeta, useResetSessionData } from "@/lib/machina/hooks"
import type { DemoAccount, PublicUser, Role } from "@/lib/machina/types"
import { cn } from "@/lib/utils"

/** After sign-in: go to `next` when this role may open it, otherwise to the role's area. */
export function useAfterSignIn(next?: string | null) {
  const router = useRouter()
  const reset = useResetSessionData()
  return async (user: PublicUser, fallback?: string) => {
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

export function useDemoAccounts() {
  return useQuery({
    queryKey: ["demo", "accounts"],
    queryFn: () => api.get<{ accounts: DemoAccount[]; password: string }>("/api/demo/accounts"),
  })
}

export function LoginView({ next }: { next?: string }) {
  const after = useAfterSignIn(next)
  const demo = useDemoAccounts()
  const [form, setForm] = useState({ email: "", password: "" })
  const login = useMutation({
    mutationFn: () => api.post<{ user: PublicUser }>("/api/auth/login", form),
    onSuccess: (r) => after(r.user),
  })
  const demoLogin = useMutation({
    mutationFn: (userId: string) =>
      api.post<{ user: PublicUser }>("/api/auth/demo-login", { userId }),
    onSuccess: (r) => after(r.user),
    onError: (err) => toast.error(err.message),
  })

  return (
    <>
      <section className="border-border/70 bg-card shadow-lift mb-6 grid overflow-hidden rounded-3xl border lg:grid-cols-[1fr_1.05fr]">
        <AuthBrandPanel
          kicker="One account, every quote"
          title={
            <>
              Welcome back to <span className="text-gradient">Machina Rent</span>
            </>
          }
          points={[
            "Requests, quotes and orders for all your sites",
            "Extensions and charges only with your approval",
            "Draft invoices and documents in one place",
          ]}
        />
        <div className="p-6 sm:p-10 lg:p-12">
          <div className="eyebrow mb-2.5">Sign in</div>
          <h1 className="mb-1.5">Good to see you</h1>
          <p className="text-muted-foreground mb-7">
            Sign in with your company account, or try a demo account below.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              login.mutate()
            }}
          >
            <Field label="Email" htmlFor="l-email">
              <Input
                id="l-email"
                type="email"
                autoComplete="username"
                placeholder="name@company.it"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Password" htmlFor="l-pass" error={login.error?.message}>
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
              {login.isPending ? "Signing in…" : "Sign in"} <ArrowRight aria-hidden />
            </Button>
          </form>
          <div className="border-border/70 mt-7 grid gap-2 border-t pt-6 text-sm sm:grid-cols-2">
            <Link
              href="/register?role=client"
              className="border-border/80 hover:border-primary/40 hover:bg-primary-soft/40 text-foreground flex items-center gap-2.5 rounded-xl border px-3.5 py-3 no-underline hover:no-underline"
            >
              <HardHat aria-hidden className="text-primary size-4" />
              <span>
                <b className="block">New customer?</b>
                <span className="text-muted-foreground">Register your company</span>
              </span>
            </Link>
            <Link
              href="/register?role=partner"
              className="border-border/80 hover:border-primary/40 hover:bg-primary-soft/40 text-foreground flex items-center gap-2.5 rounded-xl border px-3.5 py-3 no-underline hover:no-underline"
            >
              <Warehouse aria-hidden className="text-primary size-4" />
              <span>
                <b className="block">Rental company?</b>
                <span className="text-muted-foreground">Register as a partner</span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      <Card>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h2 className="m-0">Try it with a demo account</h2>
          <DemoBadge />
        </div>
        <QueryView query={demo} rows={4}>
          {({ accounts, password }) => (
            <>
              <p className="text-muted-foreground text-sm">
                Demo role picker to try the connected customer and rental company flows.{" "}
                <b>It is not a real authentication system.</b> Shared password for demo accounts:{" "}
                <span className="font-mono">{password}</span>
              </p>
              <div className="mt-5 grid gap-6 lg:grid-cols-2">
                {(
                  [
                    ["client", "Customers", "Construction companies that rent machines", HardHat],
                    [
                      "partner",
                      "Rental companies",
                      "Partners that publish machines and send quotes",
                      Warehouse,
                    ],
                  ] as const
                ).map(([role, title, hint, Icon]) => (
                  <section key={role}>
                    <div className="mb-3 flex items-center gap-2.5">
                      <span className="icon-tile size-9 rounded-lg [&_svg]:size-4">
                        <Icon aria-hidden />
                      </span>
                      <div>
                        <b className="block leading-tight">{title}</b>
                        <span className="text-muted-foreground text-[0.82rem]">{hint}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {accounts
                        .filter((a) => a.role === role)
                        .map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            disabled={demoLogin.isPending}
                            onClick={() => demoLogin.mutate(a.id)}
                            className="group border-border/80 hover:border-primary/50 hover:bg-primary-soft/40 flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-white px-3.5 py-3 text-left transition-colors disabled:opacity-60"
                          >
                            <span
                              aria-hidden
                              className="bg-ink inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-[0.8rem] font-bold text-white"
                            >
                              {stripDemo(a.org)
                                .split(/\s+/)
                                .slice(0, 2)
                                .map((w) => w[0])
                                .join("")}
                            </span>
                            <span className="min-w-0 flex-1">
                              <b className="block">{stripDemo(a.org)}</b>
                              <Small className="truncate">
                                {a.name} · {a.email}
                              </Small>
                            </span>
                            <span className="text-primary-hover inline-flex items-center gap-1 text-sm font-medium">
                              Enter
                              <ArrowRight
                                aria-hidden
                                className="size-4 transition-transform group-hover:translate-x-0.5"
                              />
                            </span>
                          </button>
                        ))}
                    </div>
                  </section>
                ))}
              </div>
              <p className="text-muted-foreground mt-5 text-sm">
                Tip: use a normal and a private window to see the customer and the partner side by
                side.
              </p>
            </>
          )}
        </QueryView>
      </Card>
    </>
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
    <div className="bg-ink text-ink-foreground relative flex min-h-[360px] flex-col overflow-hidden p-8 sm:p-10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/img/yard.svg"
        alt=""
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] w-full object-cover object-bottom opacity-80"
      />
      <div
        aria-hidden
        className="from-ink via-ink/90 pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent"
      />
      <div className="relative">
        <span className="text-sun inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[0.68rem] font-semibold tracking-[0.16em] uppercase">
          <span className="bg-sun size-1.5 rounded-full" aria-hidden />
          {kicker}
        </span>
        <p className="font-heading mt-5 mb-5 text-[2rem] leading-tight font-medium text-white">
          {title}
        </p>
        <ul className="m-0 grid list-none gap-2.5 p-0">
          {points.map((t) => (
            <li key={t} className="text-ink-foreground/85 flex items-center gap-2.5 text-[0.95rem]">
              <span className="bg-sun/15 text-sun inline-flex size-6 shrink-0 items-center justify-center rounded-full">
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

export function RegisterView({ role }: { role: Role }) {
  const meta = useMeta().data
  const after = useAfterSignIn()
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
    mutationFn: () => api.post<{ user: PublicUser }>("/api/auth/register", { ...f, role }),
    onSuccess: (r) => {
      toast.success("Account created")
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

  return (
    <section className="border-border/70 bg-card shadow-lift grid overflow-hidden rounded-3xl border lg:grid-cols-[0.8fr_1.2fr]">
      <AuthBrandPanel
        kicker={role === "partner" ? "For rental companies" : "For construction companies"}
        title={
          role === "partner" ? (
            <>
              Publish your fleet, <span className="text-gradient">receive ready requests</span>
            </>
          ) : (
            <>
              One account for <span className="text-gradient">every site</span>
            </>
          )
        }
        points={
          role === "partner"
            ? [
                "Requests arrive with site, dates and needs",
                "You confirm availability and price per line",
                "Orders, changes and documents tracked",
              ]
            : [
                "Compare several rental companies at once",
                "Price locked when you accept a quote",
                "All your sites, orders and invoices together",
              ]
        }
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
              {r === "client" ? "Construction company (customer)" : "Rental company (partner)"}
            </Link>
          ))}
        </div>
        <h1>{role === "partner" ? "Rental company registration" : "Company registration"}</h1>
        <p className="text-muted-foreground text-sm">
          In this version company details are not verified automatically: production will need VAT
          number and contact verification.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            reg.mutate()
          }}
        >
          <h3>Company details</h3>
          <div className="grid gap-x-3.5 sm:grid-cols-2">
            {text("companyName", "Company name")}
            {text("vat", "VAT number", { inputMode: "numeric", placeholder: "11 digits" })}
            {text("address", "Registered address")}
            {text("city", "Town")}
            <Field label="Province" htmlFor="r-province" error={errors.province}>
              <Select
                id="r-province"
                value={f.province}
                onChange={(e) => setF({ ...f, province: e.target.value })}
                options={(meta?.provinces ?? []).map((p) => [p.id, `${p.name} (${p.id})`] as const)}
              />
            </Field>
            {text("pec", "Certified email (PEC)", { type: "email" })}
            {role === "client" && text("sdi", "SDI recipient code", { maxLength: 7 })}
          </div>
          {role === "partner" && (
            <Field label="Area served (provinces)" error={errors.zones}>
              <div className="flex flex-wrap gap-1.5">
                {(meta?.provinces ?? []).map((p) => (
                  <ChipCheck
                    key={p.id}
                    label={p.name}
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
          <h3>Contact and sign-in</h3>
          <div className="grid gap-x-3.5 sm:grid-cols-2">
            {text("name", "Full name")}
            {text("phone", "Phone", { type: "tel" })}
            {text("email", "Sign-in email", { type: "email", autoComplete: "username" })}
            {text("password", "Password (min. 8 characters)", {
              type: "password",
              autoComplete: "new-password",
            })}
          </div>
          <Field label="" error={errors.acceptTerms}>
            <Check
              checked={f.acceptTerms}
              onChange={(e) => setF({ ...f, acceptTerms: e.target.checked })}
              label="I act on behalf of the company above and accept the terms of use (text to be defined)."
            />
          </Field>
          <Button type="submit" variant="primary" size="lg" disabled={reg.isPending}>
            {reg.isPending ? "Creating…" : "Create account"}
          </Button>
        </form>
      </div>
    </section>
  )
}
