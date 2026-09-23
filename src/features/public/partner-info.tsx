"use client"

import Link from "next/link"

import { PageHead, TableWrap } from "@/components/app/bits"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { eur, pct } from "@/lib/machina/format"
import { useMeta } from "@/lib/machina/hooks"

const POINTS = [
  [
    "Your catalogue",
    "Add machines by hand from the dashboard or import a CSV file with a preview and error checks. You can attach your PDF catalogue (no automatic data extraction).",
  ],
  [
    "Structured requests",
    "Receive only the lines that concern your machines. Check availability and conditions, adjust prices, and approve or decline. The customer accepts a quote with an expiry date and tracked versions.",
  ],
  [
    "Orders and documents",
    "Extensions, accessories and charges always need the customer's approval. Machina prepares the draft invoice; you issue the invoice with your own software and upload it to the order.",
  ],
]

export function PartnerInfoView() {
  const settings = useMeta().data?.settings
  return (
    <>
      <PageHead
        title="Become a Machina Rent partner"
        actions={
          <Link
            href="/register?role=partner"
            className={buttonVariants({ variant: "primary", size: "lg" })}
          >
            Register as a rental company
          </Link>
        }
      >
        <span className="block max-w-[720px]">
          For construction equipment rental companies working in Turin and Piedmont. Publish your
          machines with prices and conditions, receive requests that already include site, period
          and needs, and keep control of availability, quotes and invoicing.
        </span>
      </PageHead>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {POINTS.map(([title, body]) => (
          <Card key={title} flat>
            <h3>{title}</h3>
            <p className="m-0 text-sm">{body}</p>
          </Card>
        ))}
      </div>
      <Card flat>
        <h2 className="flex items-center gap-2">
          Business model <Badge tone="warn">Assumption</Badge>
        </h2>
        <p className="text-muted-foreground text-sm">
          {settings?.hypothesisNote} The customer pays the rental company directly; Machina invoices
          the partner for commission and subscription.
        </p>
        <TableWrap>
          <thead>
            <tr>
              <th>Plan</th>
              <th className="num">Monthly fee</th>
              <th className="num">Commission on confirmed orders</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {settings?.plans.map((p) => (
              <tr key={p.id}>
                <td>
                  <b>{p.name}</b>
                </td>
                <td className="num">{eur(p.monthly)}</td>
                <td className="num">{pct(p.commissionRate)}</td>
                <td className="text-sm">{p.description}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>
      <Alert tone="info" className="mt-4" title="Integrations">
        There is no direct connection to rental companies&apos; management software yet: API
        integration is a future step.
      </Alert>
    </>
  )
}
