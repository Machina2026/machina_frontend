"use client"

import { useQuery } from "@tanstack/react-query"
import {
  ClipboardCheck,
  Hourglass,
  ListChecks,
  MessageSquareQuote,
  Package,
  Receipt,
  TriangleAlert,
  Truck,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { PageHead, Small, TableWrap } from "@/components/app/bits"
import { ActionList, PanelTitle, Stat, StatGrid, WelcomeBanner } from "@/components/app/dashboard"
import { QueryView } from "@/components/app/query-view"
import { StatusBadge } from "@/components/app/status-badge"
import { useBuyerSummary } from "@/components/layout/dash-shell"
import { EmptyState } from "@/components/states/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { api, downloadFile } from "@/lib/machina/api"
import { date, eur, stripDemo } from "@/lib/machina/format"
import { useMe } from "@/lib/machina/hooks"
import { CHANGE_KIND, CHARGE_KIND, DOC_TYPE } from "@/lib/machina/labels"
import type { ClientDocument, Order, OrderSummary, RequestListItem } from "@/lib/machina/types"

type OrderWithSummary = Order & { summary: OrderSummary }

export function useBuyerOrders() {
  return useQuery({
    queryKey: ["buyer", "orders"],
    queryFn: () => api.get<{ orders: OrderWithSummary[] }>("/api/client/orders"),
  })
}

export function BuyerOverview() {
  const me = useMe().data
  const summary = useBuyerSummary()
  return (
    <QueryView query={summary}>
      {(s) => (
        <>
          <WelcomeBanner
            name={me?.user.name}
            org={me?.org.name}
            subtitle={
              s.actions.length
                ? `You have ${s.actions.length} thing${s.actions.length === 1 ? "" : "s"} to do. Everything else is on track.`
                : "Nothing needs your attention right now."
            }
            actions={
              <>
                <Link href="/catalog" className={buttonVariants({ variant: "primary" })}>
                  Search for a machine
                </Link>
                <Link href="/assistant" className={buttonVariants({ variant: "glass" })}>
                  Describe a job
                </Link>
              </>
            }
          />
          <StatGrid>
            <Stat
              n={s.counts.quotesToEvaluate}
              label="Quotes to review"
              href="/buyer/requests"
              icon={MessageSquareQuote}
              hot
            />
            <Stat
              n={s.counts.waitingPartner}
              label="Parts awaiting partners"
              href="/buyer/requests"
              icon={Hourglass}
            />
            <Stat
              n={s.counts.activeOrders}
              label="Active orders"
              href="/buyer/orders"
              icon={Truck}
            />
            <Stat
              n={s.counts.changesToApprove}
              label="Changes to approve"
              href="/buyer/changes"
              icon={ClipboardCheck}
              hot
            />
            <Stat
              n={s.counts.chargesToVerify}
              label="Charges to review"
              href="/buyer/changes"
              icon={TriangleAlert}
              hot
            />
            <Stat
              n={s.counts.paymentsOpen}
              label="Unpaid orders"
              href="/buyer/documents"
              icon={Receipt}
            />
          </StatGrid>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <PanelTitle icon={ListChecks}>To do</PanelTitle>
              <ActionList actions={s.actions} />
            </Card>
            <Card>
              <PanelTitle
                icon={Package}
                aside={
                  <Link href="/buyer/orders" className="text-sm font-medium">
                    All orders
                  </Link>
                }
              >
                Latest orders
              </PanelTitle>
              {s.recentOrders.length ? (
                <div className="space-y-2">
                  {s.recentOrders.map((o) => (
                    <Link
                      key={o.id}
                      href={`/buyer/orders/${o.id}`}
                      className="text-foreground border-border/70 hover:border-primary/40 hover:bg-primary-soft/40 flex justify-between gap-3 rounded-xl border px-3.5 py-3 no-underline transition-colors hover:no-underline"
                    >
                      <span>
                        <b>{o.code}</b> · {o.partnerName}
                        <Small>
                          {date(o.period.from)} → {date(o.period.to)}
                        </Small>
                      </span>
                      <span className="text-right">
                        <StatusBadge kind="order" status={o.status} />
                        <div className="text-sm">{eur(o.summary.agreedGross)}</div>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <Small>No orders.</Small>
              )}
            </Card>
          </div>
        </>
      )}
    </QueryView>
  )
}

export function BuyerRequests() {
  const router = useRouter()
  const q = useQuery({
    queryKey: ["buyer", "requests"],
    queryFn: () => api.get<{ requests: RequestListItem[] }>("/api/client/requests"),
  })
  return (
    <>
      <PageHead
        title="Requests and quotes"
        actions={
          <Link href="/request" className={buttonVariants({ variant: "primary" })}>
            New request
          </Link>
        }
      >
        A request can involve several partners: each part has its own quote and status.
      </PageHead>
      <QueryView query={q}>
        {({ requests }) =>
          requests.length ? (
            <TableWrap>
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Site</th>
                  <th>Period</th>
                  <th>Parts</th>
                  <th>Overall status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr
                    key={r.id}
                    className="clickable"
                    onClick={() => router.push(`/buyer/requests/${r.id}`)}
                  >
                    <td className="whitespace-nowrap">
                      <Link
                        href={`/buyer/requests/${r.id}`}
                        className="text-foreground font-semibold"
                      >
                        {r.code}
                      </Link>
                      <Small>
                        {date(r.createdAt)}
                        {r.source === "assistant" && " · assistant"}
                      </Small>
                      {r.parts.some((p) => p.status === "sent") && (
                        <Badge tone="accent" className="mt-1.5">
                          Quote to review
                        </Badge>
                      )}
                    </td>
                    <td>{r.site.name}</td>
                    <td className="whitespace-nowrap">
                      {date(r.period.from)} → {date(r.period.to)}
                    </td>
                    <td>
                      {r.parts.map((p) => (
                        <div key={p.id} className="text-sm">
                          {stripDemo(p.partnerName)} <StatusBadge kind="quote" status={p.status} />
                        </div>
                      ))}
                    </td>
                    <td>
                      <StatusBadge kind="request" status={r.overview.status} />
                      <Small>{r.overview.label}</Small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          ) : (
            <EmptyState
              image="/img/empty-request.svg"
              title="You haven't sent any requests yet."
              action={
                <Link href="/catalog" className={buttonVariants({ variant: "primary" })}>
                  Search for a machine
                </Link>
              }
            />
          )
        }
      </QueryView>
    </>
  )
}

export function BuyerOrders() {
  const router = useRouter()
  const q = useBuyerOrders()
  return (
    <>
      <PageHead title="Orders">Order status and payment status are independent.</PageHead>
      <QueryView query={q}>
        {({ orders }) =>
          orders.length ? (
            <TableWrap>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Rental company</th>
                  <th>Machines</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th className="num">Agreed total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className="clickable"
                    onClick={() => router.push(`/buyer/orders/${o.id}`)}
                  >
                    <td className="whitespace-nowrap">
                      <Link
                        href={`/buyer/orders/${o.id}`}
                        className="text-foreground font-semibold"
                      >
                        {o.code}
                      </Link>
                    </td>
                    <td>{o.partnerName}</td>
                    <td className="text-sm">{o.items.map((i) => i.label).join(", ")}</td>
                    <td className="whitespace-nowrap">
                      {date(o.period.from)} → {date(o.period.to)}
                    </td>
                    <td>
                      <StatusBadge kind="order" status={o.status} />
                      {o.changes.some((c) => c.status === "pending_approval") && (
                        <div className="mt-1">
                          <Badge tone="accent">change to approve</Badge>
                        </div>
                      )}
                    </td>
                    <td>
                      <StatusBadge kind="payment" status={o.payment.status} />
                    </td>
                    <td className="num">{eur(o.summary.agreedGross)}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          ) : (
            <EmptyState
              title="No orders yet."
              description="Orders are created when you accept a quote."
            />
          )
        }
      </QueryView>
    </>
  )
}

export function BuyerChanges() {
  const q = useBuyerOrders()
  return (
    <>
      <PageHead title="Changes to approve">
        Extensions, accessories and services proposed by rental companies, and extra charges to
        review. Only what you accept changes the agreed total.
      </PageHead>
      <QueryView query={q}>
        {({ orders }) => {
          const items = orders.flatMap((o) => [
            ...o.changes
              .filter((c) => c.status === "pending_approval" || c.status === "requested_by_client")
              .map((c) => ({
                o,
                key: c.id,
                open: c.status === "pending_approval",
                code: c.code,
                badge: <StatusBadge kind="change" status={c.status} />,
                text: (
                  <>
                    {CHANGE_KIND[c.kind]}: {c.reason}
                    {c.line && (
                      <>
                        {" "}
                        — <b>{eur(c.line.amount)} + VAT</b>
                      </>
                    )}
                  </>
                ),
              })),
            ...o.charges
              .filter((c) => c.status === "pending_review" || c.status === "disputed")
              .map((c) => ({
                o,
                key: c.id,
                open: c.status === "pending_review",
                code: c.code,
                badge: <StatusBadge kind="charge" status={c.status} />,
                text: (
                  <>
                    {CHARGE_KIND[c.kind]}: {c.description} — <b>{eur(c.amount)} + VAT</b>
                  </>
                ),
              })),
          ])
          if (!items.length) {
            return (
              <EmptyState
                title="Nothing to approve"
                description="Extensions, added services and extra charges from rental companies will appear here."
              />
            )
          }
          // Split what needs the customer's decision from what is back with the rental company.
          const groups = [
            {
              title: "Waiting for you",
              hint: "Accept or reject: only what you accept changes the agreed total.",
              items: items.filter((i) => i.open),
            },
            {
              title: "Waiting for the rental company",
              hint: "Your requests to price and your disputed charges.",
              items: items.filter((i) => !i.open),
            },
          ].filter((g) => g.items.length)
          return (
            <div className="space-y-8">
              {groups.map((g) => (
                <section key={g.title}>
                  <h2 className="mb-1 text-[1.35rem]">
                    {g.title} <span className="text-muted-foreground">({g.items.length})</span>
                  </h2>
                  <Small className="mb-3">{g.hint}</Small>
                  <div className="space-y-3">
                    {g.items.map(({ o, key, open, code, badge, text }) => (
                      <Card
                        key={key}
                        flat={!open}
                        className="flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <b>{code}</b>
                            {badge}
                            <span className="text-muted-foreground text-sm">
                              {o.code} · {stripDemo(o.partnerName)}
                            </span>
                          </div>
                          <div className="mt-1 text-[0.95rem]">{text}</div>
                        </div>
                        <Link
                          href={`/buyer/orders/${o.id}`}
                          className={buttonVariants({
                            size: "sm",
                            variant: open ? "primary" : "default",
                          })}
                        >
                          {open ? "Review in order" : "Open order"}
                        </Link>
                      </Card>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )
        }}
      </QueryView>
    </>
  )
}

export function BuyerDocuments() {
  const q = useQuery({
    queryKey: ["buyer", "documents"],
    queryFn: () => api.get<{ documents: ClientDocument[] }>("/api/client/documents"),
  })
  return (
    <>
      <PageHead title="Documents and invoices">
        Invoices are issued by the rental companies with their own software and uploaded to the
        order. Machina drafts have no tax value.
      </PageHead>
      <QueryView query={q}>
        {({ documents }) =>
          documents.length ? (
            <TableWrap>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Rental company</th>
                  <th>Draft</th>
                  <th>Uploaded invoices</th>
                  <th>Payment</th>
                  <th className="num">Agreed total</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.orderId}>
                    <td>
                      <Link href={`/buyer/orders/${d.orderId}`} className="font-semibold">
                        {d.code}
                      </Link>
                    </td>
                    <td>{d.partnerName}</td>
                    <td>
                      <Link
                        href={`/buyer/orders/${d.orderId}/draft-invoice`}
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
                            {DOC_TYPE[i.docType]} {i.number} ({date(i.date)})
                          </Button>
                        ))
                      ) : (
                        <Small>Not uploaded yet</Small>
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
            <EmptyState title="No documents." />
          )
        }
      </QueryView>
    </>
  )
}
