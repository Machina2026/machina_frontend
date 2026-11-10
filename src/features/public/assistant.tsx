"use client"

import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Check as CheckIcon,
  Loader2,
  MessageSquareText,
  Scale,
  Search,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { KV, MarkList, PageHead } from "@/components/app/bits"
import { MachinePhoto } from "@/components/app/model-image"
import { LoadingState } from "@/components/states/loading-state"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, Field } from "@/components/ui/field"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/machina/api"
import { addToDraft, readDraft, saveDraft } from "@/lib/machina/draft"
import { useCatalogText } from "@/i18n/catalog"
import { useFormat, useLocale, useMessages } from "@/i18n/client"
import { defineMessages, plural } from "@/i18n/messages"
import { stripDemo } from "@/lib/machina/format"
import { useMeta } from "@/lib/machina/hooks"
import type {
  AssistantQuestion,
  AssistantResult,
  AssistantState,
  AssistantStep,
  AssistantSuggestion,
} from "@/lib/machina/types"
import { useHydrated } from "@/lib/machina/use-hydrated"
import { cn } from "@/lib/utils"

import { ASSISTANT_SEED_KEY } from "./home"

type Message = {
  role: "user" | "bot"
  text: string
  questions?: AssistantQuestion[]
  steps?: AssistantStep[]
}
type Selection = { on: boolean; offerId: string; acc: string[] }
type Conversation = {
  state: AssistantState | null
  messages: Message[]
  result: AssistantResult | null
  selection: Record<number, Selection>
}
/** The newest answer being played back: steps shown so far, then words of the reply. */
type Reveal = { index: number; steps: number; words: number; previous: AssistantResult | null }

const KEY = "machina.assistant"
const EMPTY: Conversation = { state: null, messages: [], result: null, selection: {} }

/** Pacing of the answer playback, in ms. */
const THINK_MS = 700
const STEP_MS = 650
const WORDS_MS = 30
const WORDS_PER_TICK = 3

const STEP_ICONS: Record<AssistantStep["kind"], LucideIcon> = {
  read: MessageSquareText,
  search: Search,
  offers: Scale,
  dates: CalendarDays,
  check: ShieldCheck,
}

const tokens = (text: string) => text.split(/(\s+)/)
const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const M = defineMessages({
  en: {
    examples: [
      "Digging foundations for a house in Chieri, 1.5 m deep, from Monday for 2 weeks",
      "Gutter maintenance on a warehouse in Turin, height 12 m, outdoors, for 3 days from next week",
      "Break up the paving and redo the sub-base in a courtyard in Turin, passage 1.5 m, for 2 weeks from Monday",
    ],
    thinking: "Thinking",
    preview: "Preview",
    stepsDone: (n: number) => `Worked through ${n} ${plural(n, "step", "steps")}`,
    cantAnswer: (err: string) => `I can't answer right now (${err}). Please try again.`,
    selectOne: "Select at least one machine",
    noLimit: "No limit",
    narrowest: (m: number) => `Narrowest passage ${m} m`,
    added: (n: number) => `${n} ${plural(n, "machine", "machines")} added to the request`,
    eyebrow: "Job assistant",
    title: "Describe your job",
    newConversation: "New conversation",
    intro:
      "Tell the assistant what you need to do, in your own words. It asks what's missing, searches the catalogue and compares the rental offers for you.",
    name: "Machina assistant",
    online: "Online",
    catalogOnly: "searches the catalogue and live offers",
    hello:
      "Hi! I'm the Machina assistant. Describe the job: what you need to do, where the site is and when. If you already know sizes, access or ground conditions, add them.",
    message: "Message",
    placeholder: "Write here… (Enter to send)",
    send: "Send",
    understood: "What I understood",
    understoodHint:
      "Location, period, work and needs will appear here as you describe them. The more you mention, the better the suggestion:",
    hints: [
      "Town or site address",
      "Start date and how long",
      "What you need to do (dig, lift, compact…)",
      "Sizes: depth, height, narrowest passage",
      "Delivery and operator needs",
    ],
    toClarify: "Still to clarify",
    suggested: "Suggested machines",
    suggestedHint:
      "From the Machina catalogue. Pick the machines and the offer to include in the request.",
    optional: " · optional",
    details: "details",
    offer: "Offer",
    perDay: "/day",
    outside: " (outside area)",
    noOffer: "No active offer for this model.",
    accessories: "Accessories:",
    notOffered: " (not offered)",
    toCheck: (n: number) => `To check (${n})`,
    build: "Build my request",
    disclaimer:
      "Specs are indicative catalogue figures. Availability, final prices and technical suitability are confirmed by the partners and by the competent professional.",
  },
  it: {
    examples: [
      "Scavo per le fondazioni di una casa a Chieri, profondità 1,5 m, da lunedì per 2 settimane",
      "Pulizia delle grondaie di un capannone a Torino, altezza 12 m, all'aperto, per 3 giorni dalla prossima settimana",
      "Rompere la pavimentazione e rifare il sottofondo in un cortile a Torino, passaggio 1,5 m, per 2 settimane da lunedì",
    ],
    thinking: "Sto ragionando",
    preview: "Anteprima",
    stepsDone: (n: number) => `Ho svolto ${n} ${plural(n, "passaggio", "passaggi")}`,
    cantAnswer: (err: string) => `Non riesco a rispondere ora (${err}). Riprova.`,
    selectOne: "Seleziona almeno una macchina",
    noLimit: "Nessun limite",
    narrowest: (m: number) => `Passaggio più stretto ${m} m`,
    added: (n: number) =>
      `${n} ${plural(n, "macchina aggiunta", "macchine aggiunte")} alla richiesta`,
    eyebrow: "Assistente lavori",
    title: "Descrivi il lavoro",
    newConversation: "Nuova conversazione",
    intro:
      "Racconta all'assistente cosa devi fare, con parole tue. Chiede quello che manca, cerca nel catalogo e confronta per te le offerte di noleggio.",
    name: "Assistente Machina",
    online: "Online",
    catalogOnly: "cerca nel catalogo e nelle offerte attive",
    hello:
      "Ciao! Sono l'assistente Machina. Descrivi il lavoro: cosa devi fare, dove si trova il cantiere e quando. Se conosci già misure, accesso o condizioni del terreno, aggiungili.",
    message: "Messaggio",
    placeholder: "Scrivi qui… (Invio per inviare)",
    send: "Invia",
    understood: "Cosa ho capito",
    understoodHint:
      "Luogo, periodo, lavoro ed esigenze compariranno qui man mano che li descrivi. Più dettagli dai, migliore è il suggerimento:",
    hints: [
      "Comune o indirizzo del cantiere",
      "Data di inizio e durata",
      "Cosa devi fare (scavare, sollevare, compattare…)",
      "Misure: profondità, altezza, passaggio più stretto",
      "Esigenze di consegna e operatore",
    ],
    toClarify: "Da chiarire",
    suggested: "Macchine suggerite",
    suggestedHint:
      "Dal catalogo Machina. Scegli le macchine e l'offerta da includere nella richiesta.",
    optional: " · facoltativa",
    details: "dettagli",
    offer: "Offerta",
    perDay: "/giorno",
    outside: " (fuori zona)",
    noOffer: "Nessuna offerta attiva per questo modello.",
    accessories: "Accessori:",
    notOffered: " (non offerto)",
    toCheck: (n: number) => `Da verificare (${n})`,
    build: "Prepara la mia richiesta",
    disclaimer:
      "Le caratteristiche sono valori indicativi del catalogo. Disponibilità, prezzi finali e idoneità tecnica sono confermati dai noleggiatori e dal professionista competente.",
  },
})

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
  const t = useMessages(M)
  const locale = useLocale()
  const ct = useCatalogText()
  const { eur } = useFormat()
  const meta = useMeta().data
  // Text typed on the home page starts a new conversation; otherwise restore the saved one.
  const [conv, setConv] = useState<Conversation>(() => (readSeed() ? EMPTY : load()))
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [reveal, setReveal] = useState<Reveal | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const update = (c: Conversation) => {
    setConv(c)
    persist(c)
  }

  async function send(text: string, base: Conversation) {
    const msg = text.trim()
    if (!msg || busy || reveal) return
    let c: Conversation = { ...base, messages: [...base.messages, { role: "user", text: msg }] }
    update(c)
    setBusy(true)
    const animate = !reducedMotion()
    try {
      const [r] = await Promise.all([
        api.post<AssistantResult>("/api/assistant", { message: msg, state: c.state, locale }),
        animate ? sleep(THINK_MS) : null,
      ])
      const previous = c.result
      c = {
        ...c,
        state: r.state,
        result: r,
        selection: {},
        messages: [
          ...c.messages,
          { role: "bot", text: r.reply, questions: r.questions, steps: r.steps },
        ],
      }
      if (animate) setReveal({ index: c.messages.length - 1, steps: 0, words: 0, previous })
    } catch (err) {
      c = {
        ...c,
        messages: [
          ...c.messages,
          {
            role: "bot",
            text: t.cantAnswer((err as Error).message),
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

  // Play the newest answer back: one step at a time, then the reply a few words at a time.
  useEffect(() => {
    if (!reveal) return
    const m = conv.messages[reveal.index]
    const steps = m?.steps?.length ?? 0
    const words = m ? tokens(m.text).length : 0
    const timer =
      reveal.steps < steps
        ? setTimeout(() => setReveal({ ...reveal, steps: reveal.steps + 1 }), STEP_MS)
        : reveal.words < words
          ? setTimeout(
              () => setReveal({ ...reveal, words: reveal.words + WORDS_PER_TICK }),
              WORDS_MS
            )
          : setTimeout(() => setReveal(null), 0)
    return () => clearTimeout(timer)
  }, [reveal, conv.messages])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [conv.messages.length, busy, reveal])

  // The side panel catches up once the answer has been played back.
  const r = reveal ? reveal.previous : conv.result
  const selection = (i: number, s: AssistantSuggestion) => conv.selection[i] ?? defaultSelection(s)
  const setSelection = (i: number, s: AssistantSuggestion, patch: Partial<Selection>) =>
    update({ ...conv, selection: { ...conv.selection, [i]: { ...selection(i, s), ...patch } } })

  function makeRequest() {
    if (!r) return
    const st = r.state
    const chosen = r.suggestions
      .map((s, i) => [s, selection(i, s)] as const)
      .filter(([, c]) => c.on && c.offerId)
    if (!chosen.length) return toast.error(t.selectOne)
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
      d.needs.accessWidth = st.accessWidthM >= 99 ? t.noLimit : t.narrowest(st.accessWidthM)
    if (st.ground) d.needs.ground = st.ground
    if (st.province) d.site = { ...d.site, city: st.location ?? d.site.city, province: st.province }
    saveDraft(d)
    toast.success(t.added(chosen.length))
    router.push("/request")
  }

  const last = conv.messages[conv.messages.length - 1]
  const accName = (id: string) => meta?.accessories.find((a) => a.id === id)?.name ?? id

  return (
    <>
      <PageHead
        eyebrow={t.eyebrow}
        title={t.title}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setReveal(null)
              update(EMPTY)
            }}
          >
            {t.newConversation}
          </Button>
        }
      >
        {t.intro}
      </PageHead>
      {r?.notice && (
        <Alert tone="warn" size="sm" className="mb-3.5">
          {r.notice}
        </Alert>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="bg-card shadow-lift border-border flex h-[min(72dvh,660px)] flex-col overflow-hidden rounded-2xl border">
          <div className="bg-ink flex items-center gap-3 px-5 py-3.5 text-white">
            <span className="bg-primary text-ink inline-flex size-9 items-center justify-center rounded-xl">
              <Sparkles aria-hidden className="size-4" />
            </span>
            <div className="leading-tight">
              <b className="block text-[0.95rem]">{t.name}</b>
              <span className="text-ink-foreground/60 flex items-center gap-1.5 text-[0.78rem]">
                <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden />
                {t.online} · {t.catalogOnly}
              </span>
            </div>
            <span className="text-ink-foreground/70 ml-auto rounded-full border border-white/20 px-2 py-0.5 text-[0.7rem] font-semibold tracking-wide uppercase">
              {t.preview}
            </span>
          </div>
          <div
            ref={logRef}
            aria-live="polite"
            className="bg-secondary flex-1 space-y-3 overflow-y-auto p-5"
          >
            {!conv.messages.length ? (
              <Bubble role="bot">
                {t.hello}
                <Options options={t.examples} onPick={(text) => send(text, conv)} />
              </Bubble>
            ) : (
              conv.messages.map((m, i) => {
                const playing = reveal?.index === i ? reveal : null
                const stepsShown = playing ? playing.steps : (m.steps?.length ?? 0)
                const writing = playing && playing.steps >= (m.steps?.length ?? 0)
                const text = playing
                  ? writing
                    ? tokens(m.text).slice(0, playing.words).join("")
                    : ""
                  : m.text
                // Steps first: the bubble appears once there is text to show.
                return (
                  <div key={i} className="space-y-2">
                    {m.steps && m.steps.length > 0 && (
                      <AgentSteps
                        steps={m.steps}
                        shown={stepsShown}
                        playing={Boolean(playing)}
                        open={m === last}
                        doneLabel={t.stepsDone(m.steps.length)}
                      />
                    )}
                    {(!playing || writing) && (
                      <Bubble role={m.role}>
                        {text}
                        {m === last &&
                          !playing &&
                          m.questions?.map((q) => (
                            <Options
                              key={q.key}
                              label={q.text}
                              options={q.options}
                              onPick={(text) => send(text, conv)}
                            />
                          ))}
                      </Bubble>
                    )}
                  </div>
                )
              })
            )}
            {busy && <Thinking label={t.thinking} />}
          </div>
          <form
            className="flex items-end gap-2 border-t bg-white p-3"
            onSubmit={(e) => {
              e.preventDefault()
              const v = input
              setInput("")
              void send(v, conv)
            }}
          >
            <Textarea
              aria-label={t.message}
              rows={1}
              className="min-h-10 flex-1"
              placeholder={t.placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  e.currentTarget.form?.requestSubmit()
                }
              }}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={busy || Boolean(reveal)}
              aria-label={t.send}
            >
              <SendHorizontal aria-hidden /> <span className="max-sm:sr-only">{t.send}</span>
            </Button>
          </form>
        </div>

        <aside className="space-y-3">
          <Card flat>
            <h3>{t.understood}</h3>
            {r?.summary.length ? (
              <KV items={r.summary.map((s) => [s.label, s.value])} />
            ) : (
              <>
                <p className="text-muted-foreground text-sm">{t.understoodHint}</p>
                <MarkList tone="tick" className="text-sm" items={t.hints} />
              </>
            )}
            {r && r.remaining.length > 0 && (
              <>
                <h4 className="mt-3 mb-1.5">{t.toClarify}</h4>
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
              <h3>{t.suggested}</h3>
              <p className="text-muted-foreground text-sm">{t.suggestedHint}</p>
              {r.suggestions.map((s, i) => {
                const sel = selection(i, s)
                const offer = s.offers.find((o) => o.offerId === sel.offerId) ?? s.offers[0]
                return (
                  <div key={s.modelId} className={cn("border-t py-3", !sel.on && "opacity-60")}>
                    <div className="flex gap-3">
                      <span className="bg-accent relative h-12 w-[72px] shrink-0 overflow-hidden rounded border">
                        <MachinePhoto src={s.image} alt="" sizes="72px" />
                      </span>
                      <div className="flex-1">
                        <Check
                          checked={sel.on}
                          onChange={(e) => setSelection(i, s, { on: e.target.checked })}
                          label={<b>{s.label}</b>}
                        />
                        <div className="text-muted-foreground text-[0.85rem]">
                          {ct.subtype(s.subtype)}
                          {s.optional && t.optional} ·{" "}
                          <Link href={`/models/${s.modelId}`} target="_blank">
                            {t.details}
                          </Link>
                        </div>
                      </div>
                    </div>
                    <MarkList tone="tick" className="mt-1.5 text-sm" items={s.reasons} />
                    {s.offers.length ? (
                      <Field label={t.offer} htmlFor={`sg-${i}`} className="my-2">
                        <Select
                          id={`sg-${i}`}
                          value={offer?.offerId}
                          onChange={(e) => setSelection(i, s, { offerId: e.target.value })}
                          options={s.offers.map(
                            (o) =>
                              [
                                o.offerId,
                                `${stripDemo(o.partnerName)} — ${eur(o.day)}${t.perDay}${o.inZone === false ? t.outside : ""}`,
                              ] as const
                          )}
                        />
                      </Field>
                    ) : (
                      <Alert tone="warn" size="sm" className="my-2">
                        {t.noOffer}
                      </Alert>
                    )}
                    {s.accessoryIds.length > 0 && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                        <b>{t.accessories}</b>
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
                              label={`${accName(a)}${offered ? "" : t.notOffered}`}
                            />
                          )
                        })}
                      </div>
                    )}
                    <details className="mt-1.5 text-sm">
                      <summary className="cursor-pointer">{t.toCheck(s.toVerify.length)}</summary>
                      <MarkList tone="confirm" className="mt-1" items={s.toVerify} />
                    </details>
                  </div>
                )
              })}
              <Button variant="primary" block className="mt-2" onClick={makeRequest}>
                {t.build} <ArrowRight aria-hidden />
              </Button>
              <p className="text-faint mt-2 text-[0.8rem]">{t.disclaimer}</p>
            </Card>
          )}
        </aside>
      </div>
    </>
  )
}

function Bubble({
  role,
  lang,
  children,
}: {
  role: "user" | "bot"
  lang?: string
  children: React.ReactNode
}) {
  return (
    <div lang={lang} className={cn("flex items-end gap-2", role === "user" && "flex-row-reverse")}>
      {role === "bot" && <BotAvatar />}
      <div
        className={cn(
          "max-w-[85%] px-4 py-3 text-[0.95rem] whitespace-pre-wrap shadow-[0_1px_2px_rgb(20_18_14/0.06)]",
          role === "user"
            ? "bg-ink rounded-2xl rounded-br-md text-white"
            : "border-border rounded-2xl rounded-bl-md border bg-white"
        )}
      >
        {children}
      </div>
    </div>
  )
}

function BotAvatar() {
  return (
    <span
      aria-hidden
      className="bg-ink inline-flex size-7 shrink-0 items-center justify-center rounded-full text-white"
    >
      <Sparkles className="size-3.5" />
    </span>
  )
}

/** Shown while the assistant works on an answer. */
function Thinking({ label }: { label: string }) {
  return (
    <div className="flex items-end gap-2" role="status">
      <BotAvatar />
      <div className="border-border text-muted-foreground flex items-center gap-2 rounded-2xl rounded-bl-md border bg-white px-4 py-3 text-sm">
        {label}
        <span className="flex gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 animate-bounce rounded-full bg-current"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  )
}

/** What the assistant did for an answer: live while it plays, then folded away. */
function AgentSteps({
  steps,
  shown,
  playing,
  open,
  doneLabel,
}: {
  steps: AssistantStep[]
  shown: number
  playing: boolean
  open: boolean
  doneLabel: string
}) {
  const box = "border-border ml-9 rounded-xl border bg-white/70 px-3.5 py-2.5 text-sm"
  if (playing) {
    return (
      <ol className={cn(box, "list-none space-y-2")} aria-live="polite">
        {steps.slice(0, Math.min(shown + 1, steps.length)).map((s, i) => (
          <StepRow key={i} step={s} done={i < shown} />
        ))}
      </ol>
    )
  }
  return (
    <details open={open} className={cn(box, "group")}>
      <summary className="text-muted-foreground flex cursor-pointer list-none items-center gap-1.5 font-medium [&::-webkit-details-marker]:hidden">
        <Sparkles aria-hidden className="text-brand size-3.5" />
        {doneLabel}
        <ChevronDown aria-hidden className="size-3.5 transition-transform group-open:rotate-180" />
      </summary>
      <ol className="mt-2 list-none space-y-2">
        {steps.map((s, i) => (
          <StepRow key={i} step={s} done />
        ))}
      </ol>
    </details>
  )
}

function StepRow({ step, done }: { step: AssistantStep; done: boolean }) {
  const Icon = STEP_ICONS[step.kind]
  return (
    <li className="flex items-start gap-2.5">
      <span
        className={cn(
          "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full",
          done ? "bg-ok-soft text-ok" : "bg-primary-soft text-brand"
        )}
      >
        {done ? (
          <CheckIcon aria-hidden className="size-3" />
        ) : (
          <Loader2 aria-hidden className="size-3 animate-spin" />
        )}
      </span>
      <div className="min-w-0">
        <div className="text-foreground flex items-center gap-1.5 font-medium">
          <Icon aria-hidden className="text-muted-foreground size-3.5 shrink-0" />
          {step.label}
          {!done && "…"}
        </div>
        {done && <div className="text-muted-foreground text-[0.82rem]">{step.detail}</div>}
      </div>
    </li>
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
          className="text-brand hover:bg-primary-soft hover:border-primary/50 cursor-pointer rounded-full border border-[#f6e2a4] bg-white px-3.5 py-1.5 text-left text-sm transition-colors"
        >
          {o}
        </button>
      ))}
    </div>
  )
}
