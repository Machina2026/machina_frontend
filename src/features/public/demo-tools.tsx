"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm"
import { Small, TableWrap } from "@/components/app/bits"
import { QueryView } from "@/components/app/query-view"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { api, ApiError } from "@/lib/machina/api"
import { clearDraft } from "@/lib/machina/draft"
import { metaKey, useMeta, useResetSessionData } from "@/lib/machina/hooks"
import type { Plan, PublicUser, Settings } from "@/lib/machina/types"

import { useAfterSignIn, useDemoAccounts } from "./auth"

export function DemoToolsView() {
  const router = useRouter()
  const confirm = useConfirm()
  const demo = useDemoAccounts()
  const meta = useMeta()
  const after = useAfterSignIn()
  const reset = useResetSessionData()

  const demoLogin = useMutation({
    mutationFn: (userId: string) =>
      api.post<{ user: PublicUser }>("/api/auth/demo-login", { userId }),
    onSuccess: (r) => after(r.user),
  })
  const resetData = useMutation({
    mutationFn: () => api.post("/api/demo/reset"),
    onSuccess: async () => {
      clearDraft()
      try {
        localStorage.removeItem("machina.assistant")
      } catch {
        // Ignore.
      }
      await reset()
      router.refresh()
      toast.success("Demo data restored")
    },
  })

  return (
    <>
      <h1>Demo tools</h1>
      <p className="text-muted-foreground">
        This page only exists in the demo version. In production, these settings are reserved for
        Machina staff.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2>Demo accounts</h2>
          <QueryView query={demo} rows={4}>
            {({ accounts, password }) => (
              <>
                <p className="text-sm">
                  Shared password: <span className="font-mono">{password}</span>. The picker is not
                  real authentication.
                </p>
                <TableWrap>
                  <tbody>
                    {accounts.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <b>{a.org}</b>
                          <Small>{a.email}</Small>
                        </td>
                        <td>{a.role === "client" ? "Customer" : "Partner"}</td>
                        <td className="num">
                          <Button size="sm" onClick={() => demoLogin.mutate(a.id)}>
                            Enter
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              </>
            )}
          </QueryView>
          <h3 className="mt-5">Assistant</h3>
          <p className="text-sm">
            Active engine:{" "}
            <b>
              {meta.data?.aiMode === "ai"
                ? "Claude (API configured on the server)"
                : "Guided demo simulation (no API key)"}
            </b>
          </p>
          <h3>Data</h3>
          <p className="text-sm">
            Restore the demo partners, offers, requests and orders. All changes made while trying
            the demo will be lost, and you will be signed out.
          </p>
          <Button
            variant="danger"
            disabled={resetData.isPending}
            onClick={async () => {
              const ok = await confirm({
                title: "Restore the demo data?",
                body: "All requests, orders and changes made while trying the demo will be replaced by the initial data. Accounts you created will be deleted.",
                confirmLabel: "Restore",
                danger: true,
              })
              if (ok) resetData.mutate()
            }}
          >
            Restore demo data
          </Button>
        </Card>
        <Card>
          <h2 className="flex items-center gap-2">
            Commissions and plans <Badge tone="warn">Assumption</Badge>
          </h2>
          <QueryView query={meta}>{(m) => <PlansForm settings={m.settings} />}</QueryView>
        </Card>
      </div>
    </>
  )
}

function PlansForm({ settings }: { settings: Settings }) {
  const qc = useQueryClient()
  const [plans, setPlans] = useState<Plan[]>(settings.plans)
  const save = useMutation({
    mutationFn: () => api.put<Settings>("/api/demo/settings", { plans }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: metaKey })
      toast.success("Assumptions saved")
    },
    onError: (err) => toast.error(err.message),
  })
  const errors = save.error instanceof ApiError ? save.error.fields : {}
  const setPlan = (i: number, patch: Partial<Record<"monthly" | "commissionRate", string>>) =>
    setPlans(plans.map((p, j) => (j === i ? ({ ...p, ...patch } as unknown as Plan) : p)))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
    >
      <p className="text-muted-foreground text-sm">{settings.hypothesisNote}</p>
      {plans.map((p, i) => (
        <div key={p.id}>
          <h4 className="mb-2">{p.name}</h4>
          <div className="grid gap-x-3.5 sm:grid-cols-2">
            <Field
              label="Monthly fee (€)"
              htmlFor={`p-${i}-m`}
              error={errors[`plans.${i}.monthly`]}
            >
              <Input
                id={`p-${i}-m`}
                type="number"
                min={0}
                step={1}
                value={p.monthly}
                onChange={(e) => setPlan(i, { monthly: e.target.value })}
              />
            </Field>
            <Field
              label="Commission (0–0.5)"
              htmlFor={`p-${i}-c`}
              error={errors[`plans.${i}.commissionRate`]}
            >
              <Input
                id={`p-${i}-c`}
                type="number"
                min={0}
                max={0.5}
                step={0.005}
                value={p.commissionRate}
                onChange={(e) => setPlan(i, { commissionRate: e.target.value })}
              />
            </Field>
          </div>
        </div>
      ))}
      <Button type="submit" variant="primary" disabled={save.isPending}>
        Save assumptions
      </Button>
    </form>
  )
}
