"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm"
import { Crumbs, KV, MarkList, Small } from "@/components/app/bits"
import { SiteBlock, Timeline } from "@/components/app/details"
import { LinesTable } from "@/components/app/lines-table"
import { QueryView } from "@/components/app/query-view"
import { StatusBadge } from "@/components/app/status-badge"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardHead } from "@/components/ui/card"
import { api, downloadFile } from "@/lib/machina/api"
import { date, dateTime, eur, num } from "@/lib/machina/format"
import { CHANGE_KIND, CHARGE_KIND, DOC_TYPE } from "@/lib/machina/labels"
import type { OrderChange, OrderCharge, OrderView, Role } from "@/lib/machina/types"

import {
  ChargeDialog,
  ChargeReviseDialog,
  ClientChangeDialog,
  ConfirmPaymentDialog,
  DeclarePaymentDialog,
  InvoiceDialog,
  PartnerChangeDialog,
  ReasonDialog,
  type Submit,
} from "./order-dialogs"

type Dialog =
  | { kind: "change" }
  | { kind: "price-change"; change: OrderChange }
  | { kind: "decline-change"; change: OrderChange }
  | { kind: "reject-change"; change: OrderChange }
  | { kind: "dispute-charge"; charge: OrderCharge }
  | { kind: "charge" }
  | { kind: "revise-charge"; charge: OrderCharge }
  | { kind: "invoice" }
  | { kind: "declare-payment" }
  | { kind: "confirm-payment" }

export const orderKey = (role: Role, id: string) => ["order", role, id] as const

export function OrderDetail({ id, role }: { id: string; role: Role }) {
  const base = role === "client" ? "/api/client/orders/" : "/api/partner/orders/"
  const area = role === "client" ? "/buyer" : "/supplier"
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const order = useQuery({
    queryKey: orderKey(role, id),
    queryFn: () => api.get<OrderView>(base + id),
  })

  /** POST an order action, then refresh the order and the dashboard counts. */
  const post = async (path: string, body: Record<string, unknown>, success?: string) => {
    const updated = await api.post<OrderView>(base + id + path, body)
    qc.setQueryData(orderKey(role, id), updated)
    void qc.invalidateQueries({ queryKey: orderKey(role, id) })
    void qc.invalidateQueries({ queryKey: [role === "client" ? "buyer" : "supplier"] })
    if (success) toast.success(success)
  }
  const submitTo =
    (path: string, success: string): Submit =>
    (body) =>
      post(path, body, success)
  const quick = async (path: string, body: Record<string, unknown>, success: string) => {
    try {
      await post(path, body, success)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }
  const open = (file: { id: string; name: string }) =>
    downloadFile(file.id, file.name).catch((err) => toast.error(err.message))

  return (
    <QueryView query={order}>
      {(o) => {
        const s = o.summary
        const vatFactor = 1 + s.vatRate / 100
        const prolonged = o.period.to !== o.originalPeriod.to
        const active = o.status === "confirmed" || o.status === "in_progress"

        const statusAction =
          role === "partner" && (o.status === "confirmed" || o.status === "in_progress") ? (
            <Button
              onClick={async () => {
                const next = o.status === "confirmed" ? "in_progress" : "completed"
                const label =
                  next === "in_progress" ? "Mark machines delivered" : "Mark rental completed"
                if (await confirm({ title: "Update the status?", body: `${label}.` })) {
                  await quick("/status", { status: next }, "Status updated")
                }
              }}
            >
              {o.status === "confirmed" ? "Mark machines delivered" : "Mark rental completed"}
            </Button>
          ) : null

        return (
          <>
            <Crumbs items={[["Orders", `${area}/orders`], [o.code]]} />
            <div className="mb-[18px] flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="mb-1.5">Order {o.code}</h1>
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge kind="order" status={o.status} />
                  <StatusBadge kind="payment" status={o.payment.status} />
                  {o.invoices.length ? (
                    <Badge tone="ok">Invoice uploaded</Badge>
                  ) : (
                    <Badge>Invoice not uploaded</Badge>
                  )}
                </div>
                <Small className="mt-1.5">
                  {role === "client" ? "Rental company" : "Customer"}:{" "}
                  <b>{role === "client" ? o.partnerName : o.clientName}</b> · Request{" "}
                  {o.requestCode} · Quote {o.quoteCode}
                </Small>
              </div>
              {statusAction}
            </div>

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-4">
                <Card>
                  <h3>Period and site</h3>
                  <KV
                    className="mb-1.5"
                    items={[
                      [
                        "Period",
                        <>
                          {date(o.period.from)} → {date(o.period.to)}{" "}
                          {prolonged && (
                            <Badge tone="info">extended (was {date(o.originalPeriod.to)})</Badge>
                          )}
                        </>,
                      ],
                    ]}
                  />
                  <SiteBlock site={o.site} needs={o.needs} />
                </Card>

                <Card>
                  <h3>Accepted quote lines</h3>
                  <LinesTable lines={o.lines} totals={o.baseTotals} />
                  {o.info.length > 0 && (
                    <details className="mt-2 text-sm">
                      <summary className="cursor-pointer">Conditions and notes</summary>
                      <MarkList className="mt-1" items={o.info} />
                    </details>
                  )}
                </Card>

                <Card>
                  <CardHead
                    title="Rental changes"
                    actions={
                      active && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => setDialog({ kind: "change" })}
                        >
                          {role === "partner" ? "Propose a change" : "Request a change"}
                        </Button>
                      )
                    }
                  />
                  <Small className="mb-3">
                    Extensions, accessories or services added. Only the customer&apos;s acceptance
                    updates the agreed total; the original quote and the history stay available.
                  </Small>
                  {o.changes.length === 0 && <Small>No changes.</Small>}
                  {[...o.changes].reverse().map((c) => {
                    const diffGross = c.line ? (c.line.amount ?? 0) * vatFactor : 0
                    const prev = c.status === "pending_approval" ? s.agreedGross : c.prevGross
                    const next =
                      c.status === "pending_approval" ? s.agreedGross + diffGross : c.newGross
                    return (
                      <Card key={c.id} flat className="mb-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <b>
                              {c.code} · {CHANGE_KIND[c.kind]}
                            </b>{" "}
                            <span className="text-muted-foreground text-sm">
                              proposed by the {c.origin === "client" ? "customer" : "partner"} ·{" "}
                              {dateTime(c.createdAt)}
                            </span>
                          </div>
                          <StatusBadge kind="change" status={c.status} />
                        </div>
                        <p className="mt-1.5 mb-0 text-sm">
                          {c.reason}
                          {c.newTo && (
                            <>
                              <br />
                              <b>New rental end:</b> {date(c.newTo)}
                            </>
                          )}
                        </p>
                        {c.line && (
                          <>
                            <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                              <div>
                                <span className="text-muted-foreground">Previous total</span>
                                <br />
                                <b>{eur(prev)}</b>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Difference</span>
                                <br />
                                <b>+ {eur(diffGross)}</b>{" "}
                                <span className="text-faint">({eur(c.line.amount)} + VAT)</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">New total</span>
                                <br />
                                <b>{eur(next)}</b>
                              </div>
                            </div>
                            <Small className="mt-1">
                              {c.line.description} · {num(c.line.qty)} {c.line.unit} ×{" "}
                              {eur(c.line.unitPrice)}
                            </Small>
                          </>
                        )}
                        {c.decidedAt && (
                          <Small className="text-faint mt-1">
                            Decision: {c.decidedBy} · {dateTime(c.decidedAt)}
                            {c.rejectReason && ` — ${c.rejectReason}`}
                          </Small>
                        )}
                        {c.declineReason && (
                          <Small className="text-faint">Reason: {c.declineReason}</Small>
                        )}
                        {role === "partner" && c.invoiceNotice && (
                          <Alert tone="warn" size="sm" className="mt-2">
                            Accepted after the invoice was issued: handle the related tax document
                            separately.
                          </Alert>
                        )}
                        {role === "client" && c.status === "pending_approval" && (
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            <Button
                              variant="ok"
                              onClick={async () => {
                                const ok = await confirm({
                                  title: `Accept change ${c.code}?`,
                                  body: (
                                    <p>
                                      The agreed total will go from <b>{eur(s.agreedGross)}</b> to{" "}
                                      <b>{eur(s.agreedGross + diffGross)}</b> (VAT included).
                                      {c.newTo && (
                                        <>
                                          <br />
                                          New end date: <b>{date(c.newTo)}</b>.
                                        </>
                                      )}
                                      <br />
                                      <span className="text-muted-foreground text-sm">
                                        Your acceptance is recorded with your name and the date.
                                      </span>
                                    </p>
                                  ),
                                  confirmLabel: "Accept change",
                                })
                                if (ok)
                                  await quick(
                                    `/changes/${c.id}/accept`,
                                    {},
                                    "Change accepted: total updated"
                                  )
                              }}
                            >
                              Accept change
                            </Button>
                            <Button
                              variant="danger"
                              onClick={() => setDialog({ kind: "reject-change", change: c })}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {role === "partner" && c.status === "requested_by_client" && (
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            <Button
                              variant="primary"
                              onClick={() => setDialog({ kind: "price-change", change: c })}
                            >
                              Price the change
                            </Button>
                            <Button
                              variant="danger"
                              onClick={() => setDialog({ kind: "decline-change", change: c })}
                            >
                              Don&apos;t accept
                            </Button>
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </Card>

                <Card>
                  <CardHead
                    title="Extra charges"
                    actions={
                      role === "partner" &&
                      o.status !== "cancelled" && (
                        <Button size="sm" onClick={() => setDialog({ kind: "charge" })}>
                          Record a charge
                        </Button>
                      )
                    }
                  />
                  <Small className="mb-3">
                    Damage, fuel, extra cleaning. A disputed charge, or one still to review, is not
                    part of the agreed total.
                  </Small>
                  {o.charges.length === 0 && <Small>No charges.</Small>}
                  {[...o.charges].reverse().map((c) => (
                    <Card key={c.id} flat className="mb-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <b>
                            {c.code} · {CHARGE_KIND[c.kind]}
                          </b>{" "}
                          <span className="text-muted-foreground text-sm">
                            {dateTime(c.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <b>{eur(c.amount)} + VAT</b>
                          <StatusBadge kind="charge" status={c.status} />
                        </div>
                      </div>
                      <p className="my-1.5 text-sm">{c.description}</p>
                      {c.files?.length ? (
                        <div className="flex flex-wrap gap-2 text-sm">
                          Attachments:
                          {c.files.map((f) => (
                            <Button key={f.id} variant="link" onClick={() => open(f)}>
                              {f.name}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <Small className="text-faint">No attachments</Small>
                      )}
                      {c.clientNote && (
                        <Alert
                          tone={c.status === "disputed" ? "bad" : "neutral"}
                          size="sm"
                          className="mt-2"
                          title="Customer's note"
                        >
                          {c.clientNote}
                        </Alert>
                      )}
                      <details className="mt-1.5 text-sm">
                        <summary className="cursor-pointer">Charge history</summary>
                        <div className="mt-2">
                          <Timeline entries={c.log} />
                        </div>
                      </details>
                      {role === "client" && c.status === "pending_review" && (
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          <Button
                            variant="ok"
                            onClick={async () => {
                              const ok = await confirm({
                                title: `Accept charge ${c.code}?`,
                                body: (
                                  <>
                                    <b>{eur(c.amount)} + VAT</b> will be added to the agreed total.
                                  </>
                                ),
                                confirmLabel: "Accept charge",
                              })
                              if (ok) await quick(`/charges/${c.id}/accept`, {}, "Charge accepted")
                            }}
                          >
                            Accept charge
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => setDialog({ kind: "dispute-charge", charge: c })}
                          >
                            Dispute
                          </Button>
                        </div>
                      )}
                      {role === "partner" &&
                        (c.status === "disputed" || c.status === "pending_review") && (
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => setDialog({ kind: "revise-charge", charge: c })}
                            >
                              Revise amount
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={async () => {
                                const ok = await confirm({
                                  title: "Withdraw the charge?",
                                  body: "The customer will no longer be asked to pay it.",
                                  confirmLabel: "Withdraw",
                                  danger: true,
                                })
                                if (ok)
                                  await quick(
                                    `/charges/${c.id}`,
                                    { action: "withdraw" },
                                    "Charge withdrawn"
                                  )
                              }}
                            >
                              Withdraw charge
                            </Button>
                          </div>
                        )}
                    </Card>
                  ))}
                </Card>

                <Card>
                  <CardHead
                    title="Documents"
                    actions={
                      role === "partner" &&
                      o.status !== "cancelled" && (
                        <Button size="sm" onClick={() => setDialog({ kind: "invoice" })}>
                          Upload final invoice
                        </Button>
                      )
                    }
                  />
                  {role === "partner" &&
                    o.notices.map((n, i) => (
                      <Alert
                        key={i}
                        tone="warn"
                        size="sm"
                        className="mb-2"
                        title="Attention — tax document"
                      >
                        {n.text}
                      </Alert>
                    ))}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b py-2">
                    <div>
                      <b>Draft invoice</b>
                      <Small>
                        Not valid for tax purposes · includes accepted lines and approved changes
                      </Small>
                    </div>
                    <Link
                      href={`${area}/orders/${o.id}/draft-invoice`}
                      className={buttonVariants({ size: "sm" })}
                    >
                      Open draft
                    </Link>
                  </div>
                  {o.invoices.length ? (
                    o.invoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-b-0"
                      >
                        <div>
                          <b>
                            {DOC_TYPE[inv.docType]} no. {inv.number} of {date(inv.date)}
                          </b>
                          <Small>
                            {eur(inv.amount)} · uploaded on {dateTime(inv.uploadedAt)} by{" "}
                            {inv.uploadedBy}
                            {inv.note && ` · ${inv.note}`}
                          </Small>
                          <Small className="text-faint">
                            Issued by the rental company with its own software. Uploading to Machina
                            is not a submission to the SdI.
                          </Small>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => open({ id: inv.fileId, name: inv.fileName })}
                        >
                          Download
                        </Button>
                      </div>
                    ))
                  ) : (
                    <Small className="mt-2">
                      {role === "partner"
                        ? "No invoice uploaded. Issue the invoice with your software and upload it here: the customer will see it."
                        : "The rental company has not uploaded the invoice yet."}
                    </Small>
                  )}
                </Card>

                <Card>
                  <h3>History</h3>
                  <Timeline entries={o.history} />
                </Card>
              </div>

              <aside className="space-y-4 xl:sticky xl:top-[88px]">
                <Card>
                  <h3>Agreed total</h3>
                  <table className="w-full text-[0.92rem]">
                    <tbody>
                      <tr>
                        <td className="py-1">Accepted quote (v{o.acceptedVersion})</td>
                        <td className="py-1 text-right tabular-nums">{eur(s.baseNet)}</td>
                      </tr>
                      <tr>
                        <td className="py-1">Accepted changes</td>
                        <td className="py-1 text-right tabular-nums">
                          {s.changesNet ? "+ " : ""}
                          {eur(s.changesNet)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1">Accepted charges</td>
                        <td className="py-1 text-right tabular-nums">
                          {s.chargesNet ? "+ " : ""}
                          {eur(s.chargesNet)}
                        </td>
                      </tr>
                      <tr className="font-semibold">
                        <td className="py-1">Agreed net</td>
                        <td className="py-1 text-right tabular-nums">{eur(s.agreedNet)}</td>
                      </tr>
                      <tr>
                        <td className="py-1">VAT {s.vatRate}%</td>
                        <td className="py-1 text-right tabular-nums">{eur(s.vat)}</td>
                      </tr>
                      <tr className="border-foreground border-t-2 text-[1.05rem] font-bold">
                        <td className="pt-2">Agreed total</td>
                        <td className="pt-2 text-right tabular-nums">{eur(s.agreedGross)}</td>
                      </tr>
                    </tbody>
                  </table>
                  {(s.pendingChangesNet > 0 ||
                    s.pendingChargesNet > 0 ||
                    s.contestedChargesNet > 0) && (
                    <Alert size="sm" className="mt-2.5" title="Not included in the total">
                      {s.pendingChangesNet > 0 && (
                        <div>Changes to approve: {eur(s.pendingChangesNet)} + VAT</div>
                      )}
                      {s.pendingChargesNet > 0 && (
                        <div>Charges to review: {eur(s.pendingChargesNet)} + VAT</div>
                      )}
                      {s.contestedChargesNet > 0 && (
                        <div>Disputed charges: {eur(s.contestedChargesNet)} + VAT</div>
                      )}
                    </Alert>
                  )}
                  <Small className="mt-2.5">
                    🔒 Price locked: {o.quoteCode} v{o.acceptedVersion} accepted on{" "}
                    {dateTime(o.acceptance.at)} by {o.acceptance.by}.
                  </Small>
                </Card>

                <Card>
                  <h3>Payment</h3>
                  <Small className="mb-2">
                    In this MVP the customer pays the rental company directly under the agreed
                    terms. A confirmed order is not a paid order.
                  </Small>
                  <div className="mb-2">
                    <StatusBadge kind="payment" status={o.payment.status} />
                  </div>
                  {o.payment.declared && (
                    <p className="text-sm">
                      Declared by the customer: <b>{eur(o.payment.declared.amount)}</b> on{" "}
                      {date(o.payment.declared.date)} ({o.payment.declared.method})
                      {o.payment.declared.note && (
                        <>
                          <br />
                          {o.payment.declared.note}
                        </>
                      )}
                    </p>
                  )}
                  {o.payment.confirmed && (
                    <p className="text-sm">
                      Receipt confirmed by the partner: <b>{eur(o.payment.confirmed.amount)}</b> on{" "}
                      {date(o.payment.confirmed.date)}
                    </p>
                  )}
                  {role === "client" &&
                    o.payment.status === "unpaid" &&
                    o.status !== "cancelled" && (
                      <Button block onClick={() => setDialog({ kind: "declare-payment" })}>
                        Declare payment made
                      </Button>
                    )}
                  {role === "partner" &&
                    o.payment.status !== "received" &&
                    o.status !== "cancelled" && (
                      <Button
                        block
                        variant={o.payment.status === "declared" ? "ok" : "default"}
                        onClick={() => setDialog({ kind: "confirm-payment" })}
                      >
                        Confirm receipt
                      </Button>
                    )}
                </Card>
              </aside>
            </div>

            {dialog?.kind === "change" &&
              (role === "partner" ? (
                <PartnerChangeDialog
                  order={o}
                  onClose={() => setDialog(null)}
                  submit={submitTo("/changes", "Change sent to the customer for approval")}
                />
              ) : (
                <ClientChangeDialog
                  order={o}
                  onClose={() => setDialog(null)}
                  submit={submitTo("/changes", "Request sent to the partner")}
                />
              ))}
            {dialog?.kind === "price-change" && (
              <PartnerChangeDialog
                order={o}
                existing={dialog.change}
                onClose={() => setDialog(null)}
                submit={submitTo("/changes", "Change sent to the customer for approval")}
              />
            )}
            {dialog?.kind === "decline-change" && (
              <ReasonDialog
                title="Don't accept the change request"
                label="Reason (visible to the customer)"
                onClose={() => setDialog(null)}
                submit={submitTo(`/changes/${dialog.change.id}/decline`, "Request not accepted")}
              />
            )}
            {dialog?.kind === "reject-change" && (
              <ReasonDialog
                title="Reject the change?"
                label="Reason (optional)"
                optional
                confirmLabel="Reject change"
                onClose={() => setDialog(null)}
                submit={submitTo(`/changes/${dialog.change.id}/reject`, "Change rejected")}
              />
            )}
            {dialog?.kind === "dispute-charge" && (
              <ReasonDialog
                title="Dispute the charge"
                label="Reason for the dispute"
                field="note"
                confirmLabel="Dispute charge"
                onClose={() => setDialog(null)}
                submit={submitTo(`/charges/${dialog.charge.id}/dispute`, "Charge disputed")}
              />
            )}
            {dialog?.kind === "charge" && (
              <ChargeDialog
                onClose={() => setDialog(null)}
                submit={submitTo("/charges", "Charge recorded")}
              />
            )}
            {dialog?.kind === "revise-charge" && (
              <ChargeReviseDialog
                charge={dialog.charge}
                onClose={() => setDialog(null)}
                submit={submitTo(`/charges/${dialog.charge.id}`, "Charge revised")}
              />
            )}
            {dialog?.kind === "invoice" && (
              <InvoiceDialog
                order={o}
                onClose={() => setDialog(null)}
                submit={submitTo("/invoices", "Document uploaded and visible to the customer")}
              />
            )}
            {dialog?.kind === "declare-payment" && (
              <DeclarePaymentDialog
                order={o}
                onClose={() => setDialog(null)}
                submit={submitTo("/payment", "Payment declared")}
              />
            )}
            {dialog?.kind === "confirm-payment" && (
              <ConfirmPaymentDialog
                order={o}
                onClose={() => setDialog(null)}
                submit={submitTo("/payment", "Receipt confirmed")}
              />
            )}
          </>
        )
      }}
    </QueryView>
  )
}
