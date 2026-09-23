"use client"

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
    "1. Search or get help",
    "Search by category or describe the job: the assistant suggests machines from the catalogue.",
  ],
  [
    "2. Compare the offers",
    "Same period and needs for every offer: see what's included, what's missing and what needs confirming.",
  ],
  [
    "3. Send one request",
    "Machina prepares a draft with the published rates; each rental company checks and confirms its own lines.",
  ],
  [
    "4. Accept and manage",
    "Accept the final quote and follow the order, extensions, charges and documents in one place.",
  ],
]

function StepN({ n }: { n: number }) {
  return (
    <span className="bg-primary mr-2 inline-flex size-[26px] items-center justify-center rounded-full text-sm font-bold text-white">
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
      <section className="mb-7 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h1 className="mb-2 text-[2rem]">Rent machinery for your site in Turin and Piedmont</h1>
          <p className="text-muted-foreground mb-4 max-w-[640px] text-[1.05rem]">
            Compare offers from several rental companies, send a single request and manage quotes,
            orders, extensions and documents in one place.
          </p>
          <Card>
            <h2 className="mb-1.5 flex items-center">
              <StepN n={1} />
              Describe your job
            </h2>
            <p className="text-muted-foreground text-sm">
              We help you work out which machines you need by asking the right questions.
            </p>
            <form onSubmit={describe}>
              <Textarea
                aria-label="Describe your job"
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="E.g. I need to break up the paving of a courtyard in Turin, about 150 sqm, and redo the sub-base. The narrowest passage is 1.5 m wide. Starting Monday, for two weeks."
              />
              <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                <Button type="submit" variant="primary" size="lg">
                  Continue with the assistant
                </Button>
                <span className="text-muted-foreground text-sm">
                  The assistant asks questions and suggests catalogue machines.
                </span>
              </div>
            </form>
          </Card>
        </div>
        <Card className="self-end">
          <h2 className="mb-1.5 flex items-center">
            <StepN n={2} />
            Search for a machine
          </h2>
          <p className="text-muted-foreground text-sm">
            Already know what you need? Filter by category, area and period.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              router.push(`/catalog${qs(search)}`)
            }}
          >
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
            <div className="grid grid-cols-2 gap-x-3.5">
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
              Search for a machine
            </Button>
          </form>
        </Card>
      </section>

      <section className="mb-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2>Categories</h2>
          <Link href="/accessories">Compatible accessories →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(meta?.categories ?? []).map((c) => (
            <Link
              key={c.id}
              href={`/catalog?cat=${c.id}`}
              className="bg-card text-foreground hover:border-primary flex flex-col gap-1 rounded-lg border p-3 no-underline hover:no-underline"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.image}
                alt=""
                className="bg-accent aspect-[16/10] w-full rounded object-cover"
              />
              <b className="text-[0.92rem]">{c.name}</b>
              <span className="text-muted-foreground text-[0.8rem]">{c.subtypes.join(" · ")}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-7">
        <h2>How it works</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([title, body]) => (
            <div key={title} className="bg-card rounded-lg border p-4 text-[0.92rem]">
              <b className="mb-1 block">{title}</b>
              {body}
            </div>
          ))}
        </div>
      </section>

      <Card flat className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="m-0">Are you a rental company in Piedmont?</h3>
          <p className="text-muted-foreground m-0 text-sm">
            Publish your machines, receive structured requests and manage quotes and orders.
          </p>
        </div>
        <Link href="/become-a-partner" className={buttonVariants()}>
          Become a partner
        </Link>
      </Card>
    </>
  )
}
