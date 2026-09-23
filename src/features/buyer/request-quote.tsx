"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm"
import { Crumbs, KV, MarkList, Small } from "@/components/app/bits"
import { SiteBlock, Timeline, VersionsList } from "@/components/app/details"
import { LinesTable } from "@/components/app/lines-table"
import { QueryView } from "@/components/app/query-view"
import { StatusBadge } from "@/components/app/status-badge"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, Field } from "@/components/ui/field"
import { Modal, ModalActions } from "@/components/ui/modal"
import { Textarea } from "@/components/ui/textarea"
import { api, ApiError } from "@/lib/machina/api"
import { date, dateTime, eur } from "@/lib/machina/format"
import { useMeta } from "@/lib/machina/hooks"
import type { Quote, RequestDetail, RequestOverview } from "@/lib/machina/types"

function Progress({ ov }: { ov: RequestOverview }) {
  const c = ov.counts
  const segs: [number, string][] = [
    [c.accepted ?? 0, "bg-ok"],
    [c.sent ?? 0, "bg-primary"],
    [c.awaiting_partner ?? 0, "bg-[#e8c46a]"],
    [
      (c.declined_by_partner ?? 0) +
        (c.rejected_by_client ?? 0) +
        (c.expired ?? 0) +
        (c.withdrawn ?? 0),
      "bg-border-strong",
    ],
  ]
  return (
    <div
      className="bg-muted flex h-2 overflow-hidden rounded-full"
      role="img"
      aria-label={ov.label}
    >
      {segs.map(([n, cls], i) => n > 0 && <i key={i} className={cls} style={{ flex: n }} />)}
    </div>
  )
}

export function BuyerRequestDetail({ id }: { id: string }) {
  const meta = useMeta().data
  const q = useQuery({
    queryKey: ["buyer", "request", id],
    queryFn: () => api.get<RequestDetail>(`/api/client/requests/${id}`),
  })
  const accName = (a: string) => meta?.accessories.find((x) => x.id === a)?.name ?? a
  return (
    <QueryView query={q}>
      {(r) => {
        const ov = r.overview
        return (
          <>
            <Crumbs items={[["Requests", "/buyer/requests"], [r.code]]} />
            <h1 className="mb-1">Request {r.code}</h1>
            <Small className="mb-4">
              Created on {dateTime(r.createdAt)} ·{" "}
              {r.source === "assistant" ? "prepared with the assistant" : "direct search"} ·{" "}
              {date(r.period.from)} → {date(r.period.to)}
            </Small>
            <Alert
              tone={ov.status === "confirmed" ? "ok" : ov.status === "closed" ? "neutral" : "warn"}
              className="mb-3"
              title={ov.label}
            >
              {ov.status !== "confirmed" && ov.accepted
                ? "The project as a whole isn't confirmed until every part has been accepted."
                : "Each partner sees and manages only its own lines."}
            </Alert>
            <Progress ov={ov} />
            <div className="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div>
                <h2>Parts of the request</h2>
                <div className="space-y-3">
                  {r.quotes.map((qt) => {
                    const v = qt.versions[qt.versions.length - 1]
                    const alt =
                      qt.status === "declined_by_partner" ||
                      qt.status === "expired" ||
                      qt.status === "rejected_by_client"
                    return (
                      <Card
                        key={qt.id}
                        flat
                        className="flex flex-wrap items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <b>{qt.partnerName}</b>
                            <StatusBadge kind="quote" status={qt.status} />
                          </div>
                          <Small>
                            {qt.code} ·{" "}
                            {qt.items
                              .map(
                                (i) =>
                                  `${i.label}${i.qty > 1 ? ` ×${i.qty}` : ""}${i.accessoryIds.length ? ` + ${i.accessoryIds.map(accName).join(", ")}` : ""}`
                              )
                              .join(" · ")}
                          </Small>
                          <div className="text-sm">
                            {v.kind === "draft" ? "Machina draft" : `Quote v${v.n}`}:{" "}
                            <b>{eur(v.totals.net)}</b> + VAT{" "}
                            {!v.totals.complete && <Badge tone="warn">partial</Badge>}
                            {v.validUntil && qt.status === "sent" && (
                              <>
                                {" "}
                                · valid until <b>{date(v.validUntil)}</b>
                              </>
                            )}
                          </div>
                          {qt.declineReason && (
                            <div className="text-bad text-sm">Reason: {qt.declineReason}</div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {qt.orderId && (
                            <Link
                              href={`/buyer/orders/${qt.orderId}`}
                              className={buttonVariants({ size: "sm", variant: "ok" })}
                            >
                              Go to order
                            </Link>
                          )}
                          {alt && (
                            <Link
                              href={`/models/${qt.items[0].modelId}`}
                              className={buttonVariants({ size: "sm" })}
                            >
                              Find an alternative
                            </Link>
                          )}
                          <Link
                            href={`/buyer/quotes/${qt.id}`}
                            className={buttonVariants({
                              size: "sm",
                              variant: qt.status === "sent" ? "primary" : "default",
                            })}
                          >
                            {qt.status === "sent" ? "Review quote" : "Details"}
                          </Link>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
              <aside className="space-y-4">
                <Card>
                  <h3>Site and needs</h3>
                  <SiteBlock site={r.site} needs={r.needs} job={r.jobDescription} />
                </Card>
                <Card>
                  <h3>History</h3>
                  <Timeline entries={r.history} />
                </Card>
              </aside>
            </div>
          </>
        )
      }}
    </QueryView>
  )
}

function QuoteBanner({ q }: { q: Quote }) {
  const v = q.versions[q.versions.length - 1]
  switch (q.status) {
    case "awaiting_partner":
      return (
        <Alert tone="warn" title="Awaiting the partner">
          This is the draft Machina prepared from the catalogue rates. The partner has to check
          availability and conditions: the total is not final yet.
        </Alert>
      )
    case "sent":
      return (
        <Alert tone="info" title={`Final quote to accept by ${date(v.validUntil)}`}>
          The partner has checked availability and conditions. Accepting locks the price and creates
          the confirmed order.
        </Alert>
      )
    case "expired":
      return (
        <Alert tone="bad" title={`Quote expired on ${date(v.validUntil)}`}>
          It can no longer be accepted. The partner can send a new version, or you can look for an
          alternative.
        </Alert>
      )
    case "declined_by_partner":
      return (
        <Alert tone="bad" title="Declined by the partner">
          {q.declineReason}
        </Alert>
      )
    case "rejected_by_client":
      return <Alert title="You rejected this quote">{q.rejectReason}</Alert>
    case "accepted":
      return (
        <Alert tone="ok" title="Quote accepted">
          Version v{q.acceptedVersion} accepted on {dateTime(q.acceptance?.at)}.{" "}
          <Link href={`/buyer/orders/${q.orderId}`}>Go to the order →</Link>
        </Alert>
      )
    default:
      return null
  }
}

export function BuyerQuoteDetail({ id }: { id: string }) {
  const router = useRouter()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const key = ["buyer", "quote", id]
  const q = useQuery({ queryKey: key, queryFn: () => api.get<Quote>(`/api/client/quotes/${id}`) })
  const [dialog, setDialog] = useState<"accept" | "reject" | null>(null)
  const refresh = () => qc.invalidateQueries({ queryKey: ["buyer"] })

  const withdraw = useMutation({
    mutationFn: () => api.post(`/api/client/quotes/${id}/withdraw`),
    onSuccess: () => {
      toast.success("Part cancelled")
      void refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <QueryView query={q}>
      {(qt) => {
        const v = qt.versions[qt.versions.length - 1]
        return (
          <>
            <Crumbs
              items={[
                ["Requests", "/buyer/requests"],
                [qt.requestCode, `/buyer/requests/${qt.requestId}`],
                [qt.code],
              ]}
            />
            <h1 className="mb-1.5">Quote {qt.code}</h1>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <StatusBadge kind="quote" status={qt.status} />
              <span className="text-muted-foreground text-sm">
                {qt.partnerName} · current version v{v.n}
              </span>
            </div>
            <QuoteBanner q={qt} />
            <div className="mt-3 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-4">
                <Card>
                  <h3>
                    {v.kind === "draft" ? `Machina draft (v${v.n})` : `Quote lines (v${v.n})`}
                  </h3>
                  <LinesTable lines={v.lines} totals={v.totals} />
                  {v.note && (
                    <Alert size="sm" className="mt-3" title="Partner's note">
                      {v.note}
                    </Alert>
                  )}
                  {v.info.length > 0 && (
                    <details open className="mt-2.5 text-sm">
                      <summary className="cursor-pointer">Conditions and notes</summary>
                      <MarkList className="mt-1" items={v.info} />
                    </details>
                  )}
                  {v.warnings.length > 0 && (
                    <Alert tone="warn" size="sm" className="mt-2.5" title="To check">
                      <MarkList items={v.warnings} />
                    </Alert>
                  )}
                </Card>
                <Card>
                  <h3>Versions</h3>
                  <VersionsList quote={qt} />
                </Card>
                {qt.status === "sent" && (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ok" size="lg" onClick={() => setDialog("accept")}>
                      Accept quote
                    </Button>
                    <Button variant="danger" size="lg" onClick={() => setDialog("reject")}>
                      Reject
                    </Button>
                  </div>
                )}
                {qt.status === "awaiting_partner" && (
                  <Button
                    variant="danger"
                    disabled={withdraw.isPending}
                    onClick={async () => {
                      const ok = await confirm({
                        title: "Cancel this part?",
                        body: "The partner no longer needs to check it. The other parts of the request don't change.",
                        confirmLabel: "Cancel part",
                        danger: true,
                      })
                      if (ok) withdraw.mutate()
                    }}
                  >
                    Cancel this part of the request
                  </Button>
                )}
              </div>
              <aside className="space-y-4">
                <Card>
                  <h3>Period and site</h3>
                  <KV
                    className="mb-1.5"
                    items={[["Period", `${date(qt.period.from)} → ${date(qt.period.to)}`]]}
                  />
                  <SiteBlock site={qt.site} needs={qt.needs} />
                </Card>
                <Card>
                  <h3>History</h3>
                  <Timeline entries={qt.history} />
                </Card>
              </aside>
            </div>
            {dialog === "accept" && (
              <AcceptDialog
                quote={qt}
                onClose={() => setDialog(null)}
                onAccepted={(orderId) => {
                  void refresh()
                  router.push(`/buyer/orders/${orderId}`)
                }}
                onConflict={() => {
                  setDialog(null)
                  void refresh()
                }}
              />
            )}
            {dialog === "reject" && (
              <RejectDialog id={id} onClose={() => setDialog(null)} onDone={() => void refresh()} />
            )}
          </>
        )
      }}
    </QueryView>
  )
}

function AcceptDialog({
  quote: q,
  onClose,
  onAccepted,
  onConflict,
}: {
  quote: Quote
  onClose: () => void
  onAccepted: (orderId: string) => void
  onConflict: () => void
}) {
  const v = q.versions[q.versions.length - 1]
  const [terms, setTerms] = useState(false)
  const accept = useMutation({
    mutationFn: () =>
      api.post<{ orderId: string }>(`/api/client/quotes/${q.id}/accept`, {
        version: v.n,
        acceptTerms: terms,
      }),
    onSuccess: (r) => {
      toast.success("Quote accepted: order confirmed")
      onAccepted(r.orderId)
    },
    onError: (err) => {
      // 409: the quote changed meanwhile (new version, expired): reload it.
      if (err instanceof ApiError && err.status === 409) {
        toast.error(err.message)
        onConflict()
      }
    },
  })
  const fieldError = accept.error instanceof ApiError ? accept.error.fields.acceptTerms : undefined
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={`Accept quote ${q.code} v${v.n}`}>
      <table className="w-full text-[0.95rem]">
        <tbody>
          <tr>
            <td className="py-1">Net</td>
            <td className="py-1 text-right tabular-nums">{eur(v.totals.net)}</td>
          </tr>
          <tr>
            <td className="py-1">VAT {v.totals.vatRate}%</td>
            <td className="py-1 text-right tabular-nums">{eur(v.totals.vat)}</td>
          </tr>
          <tr className="border-foreground border-t-2 font-bold">
            <td className="pt-2">Total</td>
            <td className="pt-2 text-right tabular-nums">{eur(v.totals.gross)}</td>
          </tr>
        </tbody>
      </table>
      <form
        className="mt-3"
        onSubmit={(e) => {
          e.preventDefault()
          accept.mutate()
        }}
      >
        <Field label="" error={fieldError}>
          <Check
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            label="I have checked the lines, conditions and period. I accept the quote: the price will be locked and the order created."
          />
        </Field>
        <Small>
          A confirmed order is not a payment: you pay the rental company under the agreed terms.
        </Small>
        <ModalActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="ok" disabled={accept.isPending}>
            Confirm acceptance
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}

function RejectDialog({
  id,
  onClose,
  onDone,
}: {
  id: string
  onClose: () => void
  onDone: () => void
}) {
  const [reason, setReason] = useState("")
  const reject = useMutation({
    mutationFn: () => api.post(`/api/client/quotes/${id}/reject`, { reason }),
    onSuccess: () => {
      toast.success("Quote rejected")
      onDone()
      onClose()
    },
    onError: (err) => toast.error(err.message),
  })
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Reject quote">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          reject.mutate()
        }}
      >
        <Field label="Reason (optional, visible to the partner)" htmlFor="rej-reason">
          <Textarea id="rej-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <ModalActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="danger" disabled={reject.isPending}>
            Reject quote
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}
