"use client"

import { ArrowRight, FileText, Inbox, Truck } from "lucide-react"
import Link from "next/link"

import { MachinePhoto } from "@/components/app/model-image"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { eur, pct } from "@/lib/machina/format"
import { useMeta } from "@/lib/machina/hooks"
import { cn } from "@/lib/utils"

const POINTS = [
  {
    icon: Truck,
    title: "Your catalogue",
    body: "Add machines by hand or import a CSV file with a preview and error checks. You can attach your PDF catalogue (no automatic data extraction).",
  },
  {
    icon: Inbox,
    title: "Structured requests",
    body: "Receive only the lines that concern your machines. Check availability, adjust prices, then approve or decline. Quotes have an expiry date and tracked versions.",
  },
  {
    icon: FileText,
    title: "Orders and documents",
    body: "Extensions, accessories and charges always need the customer's approval. Machina drafts the invoice; you issue it with your own software and upload it.",
  },
]

const STEPS = [
  "Register your company and the provinces you serve",
  "Add your machines with prices and conditions",
  "Receive requests, confirm availability and send quotes",
  "Manage orders, changes and invoices in one place",
]

export function PartnerInfoView() {
  const settings = useMeta().data?.settings
  return (
    <>
      <section className="bg-ink relative mb-12 grid overflow-hidden rounded-2xl text-white lg:grid-cols-[1.1fr_1fr]">
        <div className="relative p-8 sm:p-12">
          <p className="text-primary mb-0 text-[0.95rem] font-semibold">For rental companies</p>
          <h1 className="relative mt-3 text-[2.4rem] leading-[1.08] text-white sm:text-[3rem]">
            List your equipment on Machina Rent
          </h1>
          <p className="relative max-w-[520px] text-[1.05rem] text-white/70">
            For construction equipment rental companies in Turin and Piedmont. Publish your
            machines, receive requests that already include site, period and needs, and keep full
            control of availability, quotes and invoicing.
          </p>
          <Link
            href="/register?role=partner"
            className={buttonVariants({
              variant: "primary",
              size: "lg",
              className: "relative mt-4",
            })}
          >
            Register as a rental company <ArrowRight aria-hidden />
          </Link>
        </div>
        <div className="relative min-h-[260px]">
          <MachinePhoto
            src="/img/wheel_loader.png"
            alt="A wheel loader on a construction site"
            sizes="(min-width: 1024px) 560px, 100vw"
            eager
          />
        </div>
      </section>

      <div className="mb-12 grid gap-5 md:grid-cols-3">
        {POINTS.map(({ icon: Icon, title, body }) => (
          <Card key={title} className="lift">
            <span className="bg-primary text-ink mb-4 inline-flex size-12 items-center justify-center rounded-xl">
              <Icon aria-hidden className="size-5" />
            </span>
            <h3>{title}</h3>
            <p className="text-muted-foreground m-0 text-[0.95rem]">{body}</p>
          </Card>
        ))}
      </div>

      <section className="mb-12">
        <div className="eyebrow">Getting started</div>
        <h2 className="mt-2 text-[2rem]">Live in four steps</h2>
        <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className="border-border bg-card relative overflow-hidden rounded-xl border p-6"
            >
              <span className="bg-ink text-primary inline-flex size-9 items-center justify-center rounded-full text-[0.9rem] font-bold">
                {i + 1}
              </span>
              <p className="relative m-0 mt-4 font-medium">{s}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <div className="eyebrow">Plans</div>
        <h2 className="mt-2 flex items-center gap-3 text-[2rem]">
          Business model <Badge tone="warn">Assumption</Badge>
        </h2>
        <p className="text-muted-foreground max-w-[760px]">
          {settings?.hypothesisNote} The customer pays the rental company directly; Machina invoices
          the partner for commission and subscription.
        </p>
        <div className="grid gap-5 md:grid-cols-2">
          {settings?.plans.map((p, i) => (
            <Card
              key={p.id}
              className={
                i === 1
                  ? "bg-ink text-ink-foreground relative overflow-hidden border-transparent"
                  : undefined
              }
            >
              <div className="relative flex items-center justify-between gap-2">
                <h3 className={cn("m-0 text-[1.5rem] font-bold", i === 1 && "text-white")}>
                  {p.name}
                </h3>
                {i === 1 && (
                  <span className="bg-primary text-ink rounded-full px-2.5 py-0.5 text-[0.75rem] font-bold">
                    Lower commission
                  </span>
                )}
              </div>
              <div className="relative mt-4 flex items-baseline gap-2">
                <span
                  className={cn(
                    "text-[2.8rem] leading-none font-bold tracking-[-0.03em]",
                    i === 1 && "text-white"
                  )}
                >
                  {eur(p.monthly)}
                </span>
                <span className={i === 1 ? "text-ink-foreground/60" : "text-muted-foreground"}>
                  / month
                </span>
              </div>
              <p className="relative mt-3 mb-0 text-[1.02rem]">
                <b className={i === 1 ? "text-primary" : "text-brand"}>{pct(p.commissionRate)}</b>{" "}
                commission on confirmed orders
              </p>
              <p
                className={cn(
                  "relative mt-2 mb-0 text-sm",
                  i === 1 ? "text-ink-foreground/65" : "text-muted-foreground"
                )}
              >
                {p.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <Alert tone="info" className="mt-8" title="Integrations">
        There is no direct connection to rental companies&apos; management software yet: API
        integration is a future step.
      </Alert>
    </>
  )
}
