"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { KV, MarkList, PageHead } from "@/components/app/bits"
import { LoadingState } from "@/components/states/loading-state"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, Field } from "@/components/ui/field"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/machina/api"
import { addToDraft, readDraft, saveDraft } from "@/lib/machina/draft"
import { eur } from "@/lib/machina/format"
import { useMeta } from "@/lib/machina/hooks"
import type {
  AssistantQuestion,
  AssistantResult,
  AssistantState,
  AssistantSuggestion,
} from "@/lib/machina/types"
import { useHydrated } from "@/lib/machina/use-hydrated"
import { cn } from "@/lib/utils"

import { ASSISTANT_SEED_KEY } from "./home"

type Message = { role: "user" | "bot"; text: string; questions?: AssistantQuestion[] }
type Selection = { on: boolean; offerId: string; acc: string[] }
type Conversation = {
  state: AssistantState | null
  messages: Message[]
  result: AssistantResult | null
  selection: Record<number, Selection>
}

const KEY = "machina.assistant"
const EMPTY: Conversation = { state: null, messages: [], result: null, selection: {} }
const EXAMPLES = [
  "Digging foundations for a house in Chieri, 1.5 m deep, from Monday for 2 weeks",
  "Gutter maintenance on a warehouse in Turin, height 12 m, outdoors, for 3 days from next week",
  "Break up the paving and redo the sub-base in a courtyard in Turin, passage 1.5 m, for 2 weeks from Monday",
]

function load(): Conversation {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY
  } catch {
    return EMPTY
  }
}
function persist(c: Conversation) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c))
  } catch {
    // Ignore: the conversation just won't survive a reload.
  }
}

const defaultSelection = (s: AssistantSuggestion): Selection => ({
  on: !s.optional,
  offerId: s.offers[0]?.offerId ?? "",
  acc: [...s.accessoryIds],
})

function readSeed(): string {
  try {
    return sessionStorage.getItem(ASSISTANT_SEED_KEY) ?? ""
  } catch {
    return ""
  }
}

export function AssistantView() {
  const hydrated = useHydrated()
  if (!hydrated) return <LoadingState />
  return <Assistant />
}

function Assistant() {
  const router = useRouter()
  const meta = useMeta().data
  // Text typed on the home page starts a new conversation; otherwise restore the saved one.
  const [conv, setConv] = useState<Conversation>(() => (readSeed() ? EMPTY : load()))
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  const update = (c: Conversation) => {
    setConv(c)
    persist(c)
  }

  async function send(text: string, base: Conversation) {
    const msg = text.trim()
    if (!msg) return
    let c: Conversation = { ...base, messages: [...base.messages, { role: "user", text: msg }] }
    update(c)
    setBusy(true)
    try {
      const r = await api.post<AssistantResult>("/api/assistant", { message: msg, state: c.state })
      c = {
        ...c,
        state: r.state,
        result: r,
        selection: {},
        messages: [...c.messages, { role: "bot", text: r.reply, questions: r.questions }],
      }
    } catch (err) {
      c = {
        ...c,
        messages: [
          ...c.messages,
          {
            role: "bot",
            text: `I can't answer right now (${(err as Error).message}). Please try again.`,
          },
        ],
      }
    }
    setBusy(false)
    update(c)
  }

  // Send the home page text once. The seed is only removed when the timer fires,
  // so StrictMode's mount → unmount → mount still sends it exactly once.
  useEffect(() => {
    const seed = readSeed()
    if (!seed) return
    const t = setTimeout(() => {
      try {
        sessionStorage.removeItem(ASSISTANT_SEED_KEY)
      } catch {
        // Storage unavailable.
      }
      void send(seed, EMPTY)
    }, 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [conv.messages.length, busy])

  const r = conv.result
  const mode = r?.mode ?? meta?.aiMode ?? "demo"
  const selection = (i: number, s: AssistantSuggestion) => conv.selection[i] ?? defaultSelection(s)
  const setSelection = (i: number, s: AssistantSuggestion, patch: Partial<Selection>) =>
    update({ ...conv, selection: { ...conv.selection, [i]: { ...selection(i, s), ...patch } } })

  function makeRequest() {
    if (!r) return
    const st = r.state
    const chosen = r.suggestions
      .map((s, i) => [s, selection(i, s)] as const)
      .filter(([, c]) => c.on && c.offerId)
    if (!chosen.length) return toast.error("Select at least one machine")
    for (const [s, c] of chosen) {
      const offer = s.offers.find((o) => o.offerId === c.offerId)!
      addToDraft({
        offerId: c.offerId,
        modelId: s.modelId,
        qty: 1,
        accessoryIds: c.acc.filter((a) => offer.accessoryIds.includes(a)),
        transport: st.transport !== false && offer.transportMode !== "unavailable",
        operator: Boolean(st.operator) && offer.operatorMode !== "unavailable",
      })
    }
    const d = structuredClone(readDraft())
    if (st.from) d.from = st.from
    if (st.to) d.to = st.to
    d.source = "assistant"
    d.jobDescription = conv.messages
      .filter((m) => m.role === "user")
      .map((m) => m.text)
      .join("\n")
    if (st.accessWidthM)
      d.needs.accessWidth =
        st.accessWidthM >= 99 ? "No limit" : `Narrowest passage ${st.accessWidthM} m`
    if (st.ground) d.needs.ground = st.ground
    if (st.province) d.site = { ...d.site, city: st.location ?? d.site.city, province: st.province }
    saveDraft(d)
    toast.success(`${chosen.length} machine${chosen.length === 1 ? "" : "s"} added to the request`)
    router.push("/request")
  }

  const last = conv.messages[conv.messages.length - 1]
  const accName = (id: string) => meta?.accessories.find((a) => a.id === id)?.name ?? id

  return (
    <>
      <PageHead
        title="Describe your job"
        actions={
          <Button size="sm" onClick={() => update(EMPTY)}>
            New conversation
          </Button>
        }
      >
        Tell us what you need to do: the assistant asks for missing information and suggests
        machines from the catalogue.
      </PageHead>
      {mode === "demo" ? (
        <Alert tone="warn" size="sm" className="mb-3.5" title="Demo mode — guided simulation">
          Replies come from predefined rules, not from an AI model. Suggestions still come from the
          catalogue.
        </Alert>
      ) : (
        <Alert tone="info" size="sm" className="mb-3.5" title="AI assistant">
          Suggestions are limited to catalogue machines; prices and availability come from the
          partners&apos; offers.
        </Alert>
      )}
      {r?.notice && (
        <Alert tone="warn" size="sm" className="mb-3.5">
          {r.notice}
        </Alert>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="bg-card flex h-[min(70dvh,640px)] flex-col overflow-hidden rounded-lg border">
          <div ref={logRef} aria-live="polite" className="flex-1 space-y-3 overflow-y-auto p-4">
            {!conv.messages.length ? (
              <Bubble role="bot">
                Hi! Describe the job: what you need to do, where the site is and when. If you
                already know sizes, access or ground conditions, add them.
                <Options options={EXAMPLES} onPick={(t) => send(t, conv)} />
              </Bubble>
            ) : (
              conv.messages.map((m, i) => (
                <Bubble key={i} role={m.role}>
                  {m.text}
                  {m === last &&
                    m.questions?.map((q) => (
                      <Options
                        key={q.key}
                        label={q.text}
                        options={q.options}
                        onPick={(t) => send(t, conv)}
                      />
                    ))}
                </Bubble>
              ))
            )}
            {busy && <p className="text-muted-foreground text-sm">The assistant is typing…</p>}
          </div>
          <form
            className="flex gap-2 border-t p-3"
            onSubmit={(e) => {
              e.preventDefault()
              const v = input
              setInput("")
              void send(v, conv)
            }}
          >
            <Textarea
              aria-label="Message"
              rows={1}
              className="min-h-10 flex-1"
              placeholder="Write here… (Enter to send)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  e.currentTarget.form?.requestSubmit()
                }
              }}
            />
            <Button type="submit" variant="primary" disabled={busy}>
              Send
            </Button>
          </form>
        </div>

        <aside className="space-y-3">
          <Card flat>
            <h3>What I understood</h3>
            {r?.summary.length ? (
              <KV items={r.summary.map((s) => [s.label, s.value])} />
            ) : (
              <p className="text-muted-foreground text-sm">
                Location, period, work and needs will appear here as you describe them.
              </p>
            )}
            {r && r.remaining.length > 0 && (
              <>
                <h4 className="mt-3 mb-1.5">Still to clarify</h4>
                <MarkList className="text-sm" items={r.remaining} />
              </>
            )}
          </Card>
          {r && r.unmet.length > 0 && (
            <Alert tone="warn" size="sm">
              {r.unmet.join(" ")}
            </Alert>
          )}
          {r && r.suggestions.length > 0 && (
            <Card flat>
              <h3>Suggested machines</h3>
              <p className="text-muted-foreground text-sm">
                From the Machina catalogue. Pick the machines and the offer to include in the
                request.
              </p>
              {r.suggestions.map((s, i) => {
                const sel = selection(i, s)
                const offer = s.offers.find((o) => o.offerId === sel.offerId) ?? s.offers[0]
                return (
                  <div key={s.modelId} className={cn("border-t py-3", !sel.on && "opacity-60")}>
                    <div className="flex gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.image}
                        alt=""
                        className="bg-accent h-12 w-[72px] shrink-0 rounded border object-cover"
                      />
                      <div className="flex-1">
                        <Check
                          checked={sel.on}
                          onChange={(e) => setSelection(i, s, { on: e.target.checked })}
                          label={<b>{s.label}</b>}
                        />
                        <div className="text-muted-foreground text-[0.85rem]">
                          {s.subtype}
                          {s.optional && " · optional"} ·{" "}
                          <Link href={`/models/${s.modelId}`} target="_blank">
                            details
                          </Link>
                        </div>
                      </div>
                    </div>
                    <MarkList tone="tick" className="mt-1.5 text-sm" items={s.reasons} />
                    {s.offers.length ? (
                      <Field label="Offer" htmlFor={`sg-${i}`} className="my-2">
                        <Select
                          id={`sg-${i}`}
                          value={offer?.offerId}
                          onChange={(e) => setSelection(i, s, { offerId: e.target.value })}
                          options={s.offers.map(
                            (o) =>
                              [
                                o.offerId,
                                `${o.partnerName} — ${eur(o.day)}/day${o.inZone === false ? " (outside area)" : ""}`,
                              ] as const
                          )}
                        />
                      </Field>
                    ) : (
                      <Alert tone="warn" size="sm" className="my-2">
                        No active offer for this model.
                      </Alert>
                    )}
                    {s.accessoryIds.length > 0 && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                        <b>Accessories:</b>
                        {s.accessoryIds.map((a) => {
                          const offered = offer?.accessoryIds.includes(a)
                          return (
                            <Check
                              key={a}
                              disabled={!offered}
                              checked={sel.acc.includes(a)}
                              onChange={(e) =>
                                setSelection(i, s, {
                                  acc: e.target.checked
                                    ? [...sel.acc, a]
                                    : sel.acc.filter((x) => x !== a),
                                })
                              }
                              label={`${accName(a)}${offered ? "" : " (not offered)"}`}
                            />
                          )
                        })}
                      </div>
                    )}
                    <details className="mt-1.5 text-sm">
                      <summary className="cursor-pointer">To check ({s.toVerify.length})</summary>
                      <MarkList tone="confirm" className="mt-1" items={s.toVerify} />
                    </details>
                  </div>
                )
              })}
              <Button variant="primary" block className="mt-2" onClick={makeRequest}>
                Prepare the request with the selected machines
              </Button>
              <p className="text-faint mt-2 text-[0.8rem]">
                Availability, final prices and technical suitability are confirmed by the partners
                and by the competent professional.
              </p>
            </Card>
          )}
        </aside>
      </div>
    </>
  )
}

function Bubble({ role, children }: { role: "user" | "bot"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "max-w-[85%] rounded-xl px-3.5 py-2.5 text-[0.95rem] whitespace-pre-wrap",
        role === "user" ? "bg-primary ml-auto text-white" : "bg-muted border"
      )}
    >
      {children}
    </div>
  )
}

function Options({
  options,
  onPick,
  label,
}: {
  options: string[]
  onPick: (text: string) => void
  label?: string
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onPick(o)}
          className="text-primary-hover hover:bg-primary-soft cursor-pointer rounded-full border border-[#f5d2b0] bg-white px-3 py-1 text-left text-sm"
        >
          {o}
        </button>
      ))}
    </div>
  )
}
