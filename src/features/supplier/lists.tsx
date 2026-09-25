"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  FileWarning,
  GitPullRequestArrow,
  Inbox,
  ListChecks,
  Send,
  TriangleAlert,
  Truck,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm"
import { PageHead, Small, TableWrap } from "@/components/app/bits"
import { ActionList, PanelTitle, Stat, StatGrid, WelcomeBanner } from "@/components/app/dashboard"
import { QueryView } from "@/components/app/query-view"
import { StatusBadge } from "@/components/app/status-badge"
import { useSupplierSummary } from "@/components/layout/dash-shell"
import { EmptyState } from "@/components/states/empty-state"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { api, downloadFile } from "@/lib/machina/api"
import { date, eur, pct } from "@/lib/machina/format"
import { useMe } from "@/lib/machina/hooks"
import { CHANGE_KIND, CHARGE_KIND, DOC_TYPE } from "@/lib/machina/labels"
import type {
  CommissionReport,
  Order,
  OrderSummary,
  PartnerDocument,
  Quote,
  QuoteStatus,
} from "@/lib/machina/types"
import { cn } from "@/lib/utils"

type OrderWithSummary = Order & { summary: OrderSummary }

function useSupplierOrders() {
  return useQuery({
    queryKey: ["supplier", "orders"],
    queryFn: () => api.get<{ orders: OrderWithSummary[] }>("/api/partner/orders"),
  })
}

export function SupplierOverview() {
  const me = useMe().data
  const summary = useSupplierSummary()
  return (
    <QueryView query={summary}>
      {(s) => (
        <>
          <WelcomeBanner
            name={me?.user.name}
            org={me?.org.name}
            subtitle={
              s.counts.newRequests
                ? `${s.counts.newRequests} new request${s.counts.newRequests === 1 ? " is" : "s are"} waiting for your quote.`
                : "No new requests right now. Keep your prices up to date to win the next one."
            }
            actions={
              <>
                <Link href="/supplier/quotes" className={buttonVariants({ variant: "primary" })}>
                  Review requests
                </Link>
                <Link
                  href="/supplier/equipment/new"
                  className={buttonVariants({ variant: "glass" })}
                >
                  Add a machine
                </Link>
              </>
            }
          />
          <StatGrid>
            <Stat
              n={s.counts.newRequests}
              label="Requests to review"
              href="/supplier/quotes"
              icon={Inbox}
              hot
            />
            <Stat
              n={s.counts.awaitingClient}
              label="Quotes awaiting the customer"
              href="/supplier/quotes?tab=sent"
              icon={Send}
            />
            <Stat
              n={s.counts.activeOrders}
              label="Active orders"
              href="/supplier/orders"
              icon={Truck}
            />
            <Stat
              n={s.counts.changesOpen}
              label="Open changes"
              href="/supplier/changes"
              icon={GitPullRequestArrow}
              hot
            />
            <Stat
              n={s.counts.chargesContested}
              label="Disputed charges"
              href="/supplier/changes"
              icon={TriangleAlert}
              hot
            />
            <Stat
              n={s.counts.invoicesMissing}
              label="Orders without an uploaded invoice"
              href="/supplier/documents"
              icon={FileWarning}
            />
          </StatGrid>
          <Card>
            <PanelTitle icon={ListChecks}>To do</PanelTitle>
            <ActionList actions={s.actions} />
          </Card>
          <Small className="mt-3">
            Machines in your catalogue: {s.counts.offers}. Integration with rental management
            software is not available yet.
          </Small>
        </>
      )}
    </QueryView>
  )
}

const TABS: { id: string; label: string; statuses: QuoteStatus[] }[] = [
  { id: "review", label: "To review", statuses: ["awaiting_partner"] },
  { id: "sent", label: "Sent to customer", statuses: ["sent"] },
  { id: "accepted", label: "Accepted", statuses: ["accepted"] },
  {
    id: "closed",
    label: "Declined / expired",
    statuses: ["declined_by_partner", "rejected_by_client", "expired", "withdrawn"],
  },
]

export function SupplierQuotes({ tab }: { tab?: string }) {
  const router = useRouter()
  const active = TABS.find((t) => t.id === tab) ?? TABS[0]
  const q = useQuery({
    queryKey: ["supplier", "quotes"],
    queryFn: () => api.get<{ quotes: Quote[] }>("/api/partner/quotes"),
  })
  return (
    <>
      <PageHead title="Requests and quotes">
        You only see the lines of a request that concern your machines.
      </PageHead>
      <QueryView query={q}>
        {({ quotes }) => {
          const list = quotes.filter((x) => active.statuses.includes(x.status))
          return (
            <>
              <div
                className="bg-muted mb-5 inline-flex flex-wrap gap-1 rounded-xl p-1"
                role="tablist"
              >
                {TABS.map((t) => (
                  <Link
                    key={t.id}
                    href={`/supplier/quotes?tab=${t.id}`}
                    role="tab"
                    aria-selected={t === active}
                    className={cn(
                      "text-muted-foreground hover:text-foreground rounded-lg px-3.5 py-2 text-[0.92rem] no-underline hover:no-underline",
                      t === active &&
                        "text-foreground bg-white font-semibold shadow-[0_1px_3px_rgb(20_18_14/0.12)]"
                    )}
                  >
                    {t.label} ({quotes.filter((x) => t.statuses.includes(x.status)).length})
                  </Link>
                ))}
              </div>
              {list.length ? (
                <TableWrap>
                  <thead>
                    <tr>
                      <th>Quote</th>
                      <th>Customer</th>
                      <th>Site</th>
                      <th>Period</th>
                      <th>Machines</th>
                      <th>Status</th>
                      <th className="num">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((x) => {
                      const v = x.versions[x.versions.length - 1]
                      return (
                        <tr
                          key={x.id}
                          className="clickable"
                          onClick={() => router.push(`/supplier/quotes/${x.id}`)}
                        >
                          <td>
                            <Link
                              href={`/supplier/quotes/${x.id}`}
                              className="text-foreground font-semibold"
                            >
                              {x.code}
                            </Link>
                            <Small>{date(x.createdAt)}</Small>
                          </td>
                          <td>{x.clientName}</td>
                          <td>
                            {x.site.city} ({x.site.province})
                          </td>
                          <td className="whitespace-nowrap">
                            {date(x.period.from)} → {date(x.period.to)}
                          </td>
                          <td className="text-sm">{x.items.map((i) => i.label).join(", ")}</td>
                          <td>
                            <StatusBadge kind="quote" status={x.status} forPartner />
                            {x.status === "sent" && v.validUntil && (
                              <Small>expires {date(v.validUntil)}</Small>
                            )}
                          </td>
                          <td className="num">
                            {eur(v.totals.net)}{" "}
                            {!v.totals.complete && <Badge tone="warn">partial</Badge>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </TableWrap>
              ) : (
                <EmptyState title="No quotes in this section." />
              )}
            </>
          )
        }}
      </QueryView>
    </>
  )
}

export function SupplierOrders() {
  const router = useRouter()
  const q = useSupplierOrders()
  return (
    <>
      <PageHead title="Orders" />
      <QueryView query={q}>
        {({ orders }) =>
          orders.length ? (
            <TableWrap>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Machines</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Invoice</th>
                  <th className="num">Agreed total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className="clickable"
                    onClick={() => router.push(`/supplier/orders/${o.id}`)}
                  >
                    <td>
                      <Link
                        href={`/supplier/orders/${o.id}`}
                        className="text-foreground font-semibold"
                      >
                        {o.code}
                      </Link>
                    </td>
                    <td>{o.clientName}</td>
                    <td className="text-sm">{o.items.map((i) => i.label).join(", ")}</td>
                    <td className="whitespace-nowrap">
                      {date(o.period.from)} → {date(o.period.to)}
                    </td>
                    <td>
                      <StatusBadge kind="order" status={o.status} />
                    </td>
                    <td>
                      <StatusBadge kind="payment" status={o.payment.status} />
                    </td>
                    <td>
                      {o.invoices.length ? (
                        <Badge tone="ok">uploaded</Badge>
                      ) : (
                        <Badge>to upload</Badge>
                      )}
                    </td>
                    <td className="num">{eur(o.summary.agreedGross)}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          ) : (
            <EmptyState title="No orders yet." />
          )
        }
      </QueryView>
    </>
  )
}

export function SupplierChanges() {
  const router = useRouter()
  const q = useSupplierOrders()
  return (
    <>
      <PageHead title="Rental changes">
        Extensions, added accessories and services, extra charges. To propose a change, open the
        order.
      </PageHead>
      <QueryView query={q}>
        {({ orders }) => {
          const rows = orders
            .flatMap((o) => [
              ...o.changes.map((x) => ({
                o,
                id: x.id,
                code: x.code,
                createdAt: x.createdAt,
                open: x.status === "requested_by_client" || x.status === "pending_approval",
                type: CHANGE_KIND[x.kind],
                description: x.reason,
                amount: x.line ? eur(x.line.amount) : <Badge tone="warn">to price</Badge>,
                badge: <StatusBadge kind="change" status={x.status} />,
              })),
              ...o.charges.map((x) => ({
                o,
                id: x.id,
                code: x.code,
                createdAt: x.createdAt,
                open: x.status === "disputed" || x.status === "pending_review",
                type: `Charge: ${CHARGE_KIND[x.kind]}`,
                description: x.description,
                amount: eur(x.amount),
                badge: <StatusBadge kind="charge" status={x.status} />,
              })),
            ])
            .sort(
              (a, b) => Number(b.open) - Number(a.open) || b.createdAt.localeCompare(a.createdAt)
            )
          if (!rows.length) return <EmptyState title="No changes." />
          return (
            <TableWrap>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Order</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th className="num">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="clickable"
                    onClick={() => router.push(`/supplier/orders/${r.o.id}`)}
                  >
                    <td>
                      <b>{r.code}</b>
                    </td>
                    <td>
                      <Link href={`/supplier/orders/${r.o.id}`} className="text-foreground">
                        {r.o.code}
                      </Link>
                      <Small>{r.o.clientName}</Small>
                    </td>
                    <td>{r.type}</td>
                    <td className="text-sm">{r.description}</td>
                    <td className="num">{r.amount}</td>
                    <td>{r.badge}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )
        }}
      </QueryView>
    </>
  )
}

export function SupplierDocuments() {
  const q = useQuery({
    queryKey: ["supplier", "documents"],
    queryFn: () => api.get<{ documents: PartnerDocument[] }>("/api/partner/documents"),
  })
  return (
    <>
      <PageHead title="Documents and draft invoices">
        Machina generates a non-tax draft for every confirmed order. Issue the invoice with your own
        software and upload it to the order: uploading is not a submission to the SdI.
      </PageHead>
      <QueryView query={q}>
        {({ documents }) => (
          <>
            {documents.flatMap((d) =>
              d.notices.map((n, i) => (
                <Alert
                  key={`${d.orderId}-${i}`}
                  tone="warn"
                  size="sm"
                  className="mb-2"
                  title={`${d.code} — tax document to handle`}
                >
                  {n.text}
                </Alert>
              ))
            )}
            {documents.length ? (
              <TableWrap>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Draft</th>
                    <th>Uploaded documents</th>
                    <th>Payment</th>
                    <th className="num">Agreed total</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((d) => (
                    <tr key={d.orderId}>
                      <td>
                        <Link href={`/supplier/orders/${d.orderId}`} className="font-semibold">
                          {d.code}
                        </Link>
                      </td>
                      <td>{d.clientName}</td>
                      <td>
                        <Link
                          href={`/supplier/orders/${d.orderId}/draft-invoice`}
                          className={buttonVariants({ size: "sm" })}
                        >
                          Draft
                        </Link>
                      </td>
                      <td>
                        {d.invoices.length ? (
                          d.invoices.map((i) => (
                            <Button
                              key={i.id}
                              variant="link"
                              className="block text-sm"
                              onClick={() =>
                                downloadFile(i.fileId, i.fileName).catch((err) =>
                                  toast.error(err.message)
                                )
                              }
                            >
                              {DOC_TYPE[i.docType]} {i.number}
                            </Button>
                          ))
                        ) : (
                          <Link href={`/supplier/orders/${d.orderId}`} className="text-sm">
                            Upload invoice →
                          </Link>
                        )}
                      </td>
                      <td>
                        <StatusBadge kind="payment" status={d.payment.status} />
                      </td>
                      <td className="num">{eur(d.summary.agreedGross)}</td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            ) : (
              <EmptyState title="No orders yet." />
            )}
          </>
        )}
      </QueryView>
    </>
  )
}

export function SupplierCommissions() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const q = useQuery({
    queryKey: ["supplier", "commissions"],
    queryFn: () => api.get<CommissionReport>("/api/partner/commissions"),
  })
  const change = useMutation({
    mutationFn: (planId: string) => api.put("/api/partner/plan", { planId }),
    onSuccess: () => {
      toast.success("Plan updated")
      void qc.invalidateQueries({ queryKey: ["supplier", "commissions"] })
    },
  })
  return (
    <>
      <PageHead title="Machina commissions and plan" />
      <QueryView query={q}>
        {(r) => (
          <>
            <Alert tone="warn" className="mb-4" title="Hypothetical values">
              {r.note} Machina will invoice the rental company for commissions and the subscription:
              Machina invoicing is not implemented yet.
            </Alert>
            <div className="mb-4 grid gap-4 md:grid-cols-2">
              {r.plans.map((p) => (
                <Card key={p.id} flat={p.id !== r.plan.id}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="m-0">{p.name} plan</h3>
                    {p.id === r.plan.id ? (
                      <Badge tone="ok">active</Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={async () => {
                          if (
                            await confirm({
                              title: "Change plan?",
                              body: "In the demo the change is immediate and free.",
                              confirmLabel: "Change plan",
                            })
                          ) {
                            change.mutate(p.id)
                          }
                        }}
                      >
                        Switch to this plan
                      </Button>
                    )}
                  </div>
                  <Small className="my-2">{p.description}</Small>
                  <dl className="grid grid-cols-[140px_1fr] gap-1 text-sm">
                    <dt className="text-muted-foreground">Monthly fee</dt>
                    <dd className="m-0 font-medium">{eur(p.monthly)}</dd>
                    <dt className="text-muted-foreground">Commission</dt>
                    <dd className="m-0 font-medium">{pct(p.commissionRate)} of confirmed orders</dd>
                  </dl>
                </Card>
              ))}
            </div>
            <Card>
              <h3>Estimated commission per order</h3>
              <Small className="mb-3">
                Base: net of the accepted quote plus accepted changes (charges for damage, fuel and
                cleaning excluded).
              </Small>
              {r.rows.length ? (
                <TableWrap>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th className="num">Base</th>
                      <th className="num">Rate</th>
                      <th className="num">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.rows.map((x) => (
                      <tr key={x.orderId}>
                        <td>
                          <Link href={`/supplier/orders/${x.orderId}`}>{x.code}</Link>
                        </td>
                        <td>{x.client}</td>
                        <td>{date(x.createdAt)}</td>
                        <td>
                          <StatusBadge kind="order" status={x.status} />
                        </td>
                        <td className="num">{eur(x.base)}</td>
                        <td className="num">{pct(x.rate)}</td>
                        <td className="num">{eur(x.commission)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td colSpan={6}>Total estimated commission (excl. VAT)</td>
                      <td className="num">{eur(r.totalCommission)}</td>
                    </tr>
                  </tbody>
                </TableWrap>
              ) : (
                <Small>No confirmed orders.</Small>
              )}
            </Card>
          </>
        )}
      </QueryView>
    </>
  )
}
