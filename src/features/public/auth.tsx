"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
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
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <h1>Sign in</h1>
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
          <Button type="submit" variant="primary" block disabled={login.isPending}>
            {login.isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-3 text-sm">
          No account? <Link href="/register?role=client">Register your company</Link> ·{" "}
          <Link href="/register?role=partner">Register as a rental company</Link>
        </p>
      </Card>
      <Card>
        <h2 className="flex items-center gap-2">
          Demo mode <DemoBadge />
        </h2>
        <QueryView query={demo} rows={4}>
          {({ accounts, password }) => (
            <>
              <p className="text-muted-foreground text-sm">
                Demo role picker to try the connected customer and rental company flows.{" "}
                <b>It is not a real authentication system.</b> Shared password for demo accounts:{" "}
                <span className="font-mono">{password}</span>
              </p>
              <div className="space-y-2">
                {accounts.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
                  >
                    <div>
                      <b>{a.org}</b>
                      <Small>
                        {a.role === "client" ? "Customer (construction company)" : "Rental company"}{" "}
                        · {a.name} · {a.email}
                      </Small>
                    </div>
                    <Button
                      size="sm"
                      disabled={demoLogin.isPending}
                      onClick={() => demoLogin.mutate(a.id)}
                    >
                      Enter
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground mt-3 text-sm">
                Tip: use a normal and a private window to see the customer and the partner side by
                side.
              </p>
            </>
          )}
        </QueryView>
      </Card>
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
    <Card className="mx-auto max-w-[760px]">
      <div className="mb-4 flex gap-1 border-b" role="tablist">
        {(["client", "partner"] as const).map((r) => (
          <Link
            key={r}
            href={`/register?role=${r}`}
            role="tab"
            aria-selected={r === role}
            className={cn(
              "text-foreground -mb-px border-b-2 px-3 py-2 no-underline hover:no-underline",
              r === role ? "border-primary text-primary-hover font-semibold" : "border-transparent"
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
    </Card>
  )
}
