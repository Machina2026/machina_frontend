"use client"

import { ArrowRight, BadgeCheck, Layers, Lock } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { qs } from "@/lib/machina/api"
import { addDays, today } from "@/lib/machina/format"
import { useMeta } from "@/lib/machina/hooks"

export const ASSISTANT_SEED_KEY = "machina.assistantSeed"

const STEPS = [
  [
    "Search or get help",
    "Search by category or describe the job: the assistant suggests machines from the catalogue.",
  ],
  [
    "Compare the offers",
    "Same period and needs for every offer: see what's included, what's missing and what needs confirming.",
  ],
  [
    "Send one request",
    "Machina prepares a draft with the published rates; each rental company checks and confirms its own lines.",
  ],
  [
    "Accept and manage",
    "Accept the final quote and follow the order, extensions, charges and documents in one place.",
  ],
]

const PROMISES = [
  { icon: Layers, text: "Several rental companies, one request" },
  { icon: BadgeCheck, text: "Published rates, compared like for like" },
  { icon: Lock, text: "Price locked when you accept" },
]

function StepN({ n }: { n: number }) {
  return (
    <span className="bg-primary-soft font-heading text-primary mr-3 inline-flex size-8 items-center justify-center rounded-full text-[0.95rem] font-semibold">
      {n}
    </span>
  )
}

export function HomeView() {
  const router = useRouter()
  const meta = useMeta().data
  const [text, setText] = useState("")
  const [search, setSearch] = useState(() => {
    const from = addDays(today(), 7)
    return { cat: "", prov: "TO", from, to: addDays(from, 4) }
  })

  function describe(e: React.FormEvent) {
    e.preventDefault()
    try {
      sessionStorage.setItem(ASSISTANT_SEED_KEY, text.trim())
    } catch {
      // Storage unavailable: the assistant simply starts empty.
    }
    router.push("/assistant")
  }

  return (
    <>
      {/* Full-bleed dark hero; body clips the horizontal overflow of 100vw. */}
      <section className="bg-ink text-ink-foreground relative mx-[calc(50%-50vw)] -mt-8 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_0%,rgb(185_88_26/0.35),transparent_60%),radial-gradient(40%_60%_at_0%_100%,rgb(201_164_92/0.14),transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_85%)] [background-size:56px_56px] opacity-[0.07]"
        />
        <div className="relative mx-auto max-w-[1240px] px-4 pt-16 pb-36 sm:pt-20">
          <div className="text-gold text-[0.75rem] font-semibold tracking-[0.2em] uppercase">
            Construction equipment rental · Turin &amp; Piedmont
          </div>
          <h1 className="mt-4 max-w-[820px] text-[2.5rem] leading-[1.08] text-white sm:text-[3.4rem]">
            The right machine for every site,{" "}
            <em className="text-[#f0c9a4] not-italic">from a single request.</em>
          </h1>
          <p className="text-ink-foreground/75 mt-5 max-w-[640px] text-[1.1rem] leading-relaxed">
            Compare offers from several rental companies, send one request and manage quotes,
            orders, extensions and documents in one place.
          </p>
          <ul className="mt-8 flex list-none flex-wrap gap-x-8 gap-y-3 p-0">
            {PROMISES.map(({ icon: Icon, text: t }) => (
              <li
                key={t}
                className="text-ink-foreground/85 flex items-center gap-2.5 text-[0.95rem]"
              >
                <Icon aria-hidden className="text-gold size-[18px]" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative -mt-24 mb-16 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <Card className="shadow-lift">
          <h2 className="mb-1.5 flex items-center text-[1.4rem]">
            <StepN n={1} />
            Describe your job
          </h2>
          <p className="text-muted-foreground mb-4">
            We work out which machines you need by asking the right questions.
          </p>
          <form onSubmit={describe}>
            <Textarea
              aria-label="Describe your job"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="E.g. I need to break up the paving of a courtyard in Turin, about 150 sqm, and redo the sub-base. The narrowest passage is 1.5 m wide. Starting Monday, for two weeks."
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button type="submit" variant="primary" size="lg">
                Continue with the assistant <ArrowRight aria-hidden />
              </Button>
              <span className="text-muted-foreground text-sm">
                It asks questions and suggests catalogue machines.
              </span>
            </div>
          </form>
        </Card>
        <Card className="shadow-lift">
          <h2 className="mb-1.5 flex items-center text-[1.4rem]">
            <StepN n={2} />
            Search for a machine
          </h2>
          <p className="text-muted-foreground mb-4">
            Already know what you need? Filter by category, area and period.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              router.push(`/catalog${qs(search)}`)
            }}
          >
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field label="Category" htmlFor="h-cat">
                <Select
                  id="h-cat"
                  value={search.cat}
                  onChange={(e) => setSearch({ ...search, cat: e.target.value })}
                  options={[
                    ["", "All categories"],
                    ...(meta?.categories ?? []).map((c) => [c.id, c.name] as const),
                  ]}
                />
              </Field>
              <Field label="Site province" htmlFor="h-prov">
                <Select
                  id="h-prov"
                  value={search.prov}
                  onChange={(e) => setSearch({ ...search, prov: e.target.value })}
                  options={[
                    ["", "All of Piedmont"],
                    ...(meta?.provinces ?? []).map((p) => [p.id, `${p.name} (${p.id})`] as const),
                  ]}
                />
              </Field>
              <Field label="From" htmlFor="h-from">
                <Input
                  id="h-from"
                  type="date"
                  value={search.from}
                  onChange={(e) => setSearch({ ...search, from: e.target.value })}
                />
              </Field>
              <Field label="To" htmlFor="h-to">
                <Input
                  id="h-to"
                  type="date"
                  value={search.to}
                  onChange={(e) => setSearch({ ...search, to: e.target.value })}
                />
              </Field>
            </div>
            <Button type="submit" variant="dark" size="lg" block>
              Search the catalogue
            </Button>
          </form>
        </Card>
      </section>

      <section className="mb-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="eyebrow">The fleet</div>
            <h2 className="mt-1.5 mb-0 text-[1.9rem]">Browse by category</h2>
          </div>
          <Link
            href="/accessories"
            className="inline-flex items-center gap-1.5 font-medium no-underline hover:underline"
          >
            Compatible accessories <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {(meta?.categories ?? []).map((c) => (
            <Link
              key={c.id}
              href={`/catalog?cat=${c.id}`}
              className="group border-border/70 bg-card text-foreground shadow-soft hover:shadow-lift flex flex-col gap-1.5 rounded-xl border p-3.5 no-underline transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:no-underline"
            >
              <div className="bg-accent overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.image}
                  alt=""
                  className="aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                />
              </div>
              <b className="mt-1.5 text-[0.98rem] leading-snug font-semibold">{c.name}</b>
              <span className="text-muted-foreground text-[0.84rem] leading-snug">
                {c.subtypes.join(" · ")}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <div className="eyebrow">How it works</div>
        <h2 className="mt-1.5 mb-6 text-[1.9rem]">From request to confirmed order</h2>
        <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="border-border/70 bg-card rounded-xl border p-6">
              <div className="font-heading text-gold text-[2.2rem] leading-none font-medium">
                0{i + 1}
              </div>
              <b className="mt-4 mb-1.5 block text-[1.02rem]">{title}</b>
              <p className="text-muted-foreground m-0 text-[0.95rem] leading-relaxed">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-ink-2 text-ink-foreground relative overflow-hidden rounded-2xl px-6 py-10 sm:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_120%_at_100%_50%,rgb(185_88_26/0.28),transparent_70%)]"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-[620px]">
            <div className="text-gold text-[0.72rem] font-semibold tracking-[0.18em] uppercase">
              For rental companies
            </div>
            <h2 className="mt-2 mb-2 text-[1.8rem] text-white">
              Are you a rental company in Piedmont?
            </h2>
            <p className="text-ink-foreground/75 m-0">
              Publish your machines, receive structured requests and manage quotes and orders.
            </p>
          </div>
          <Link
            href="/become-a-partner"
            className={buttonVariants({ variant: "primary", size: "lg" })}
          >
            Become a partner <ArrowRight aria-hidden />
          </Link>
        </div>
      </section>
    </>
  )
}
