"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FileSearch, Gauge, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Small } from "@/components/app/bits"
import { useConfirm } from "@/components/app/confirm"
import { PanelTitle } from "@/components/app/dashboard"
import { QueryView } from "@/components/app/query-view"
import { Alert } from "@/components/ui/alert"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useFormat, useLocale, useMessages } from "@/i18n/client"
import type { Locale } from "@/i18n/config"
import { defineMessages } from "@/i18n/messages"
import { api } from "@/lib/machina/api"
import type {
  CreditCheck,
  CreditChecksResponse,
  CreditLevel,
  CreditSummary,
} from "@/lib/machina/types"
import { cn } from "@/lib/utils"

// Credit bureau results, for admins reviewing a company. The bureau's values
// are Italian ("VERDE", "assenza eventi negativi"): shown as sent in Italian,
// translated where known in English.

const RATINGS = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3"] as const

/** Traffic-light colour of a risk class, best to worst. */
const SCORE_COLOR: Record<string, string> = {
  "VERDE SCURO": "#0f6b3a",
  VERDE: "#1a8a4a",
  "VERDE CHIARO": "#5fb56d",
  GIALLO: "#e8b400",
  ROSSO: "#d9452b",
  "ROSSO VIVO": "#c4231a",
  "ROSSO SCURO": "#8f1610",
  GRIGIO: "#9aa0a6",
}

export function riskTone(score: string | null | undefined): BadgeTone {
  if (!score) return "neutral"
  if (score.startsWith("VERDE")) return "ok"
  if (score === "GIALLO") return "warn"
  if (score.startsWith("ROSSO")) return "bad"
  return "neutral"
}

const SCORE_EN: Record<string, string> = {
  "VERDE SCURO": "Dark green",
  VERDE: "Green",
  "VERDE CHIARO": "Light green",
  GIALLO: "Yellow",
  ROSSO: "Red",
  "ROSSO VIVO": "Bright red",
  "ROSSO SCURO": "Dark red",
  GRIGIO: "Grey (not assessable)",
}

const DESCRIPTION_EN: Record<string, string> = {
  "assenza eventi negativi": "No negative events",
  "presenza eventi negativi": "Negative events present",
  minimo: "Minimum risk",
  "molto basso": "Very low",
  basso: "Low",
  "inferiore alla media": "Below average",
  "nella media": "Average",
  media: "Average",
  "superiore alla media": "Above average",
  "molto alto": "Very high",
  massimo: "Maximum risk",
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

function scoreLabel(score: string, locale: Locale) {
  return locale === "en" ? (SCORE_EN[score] ?? capitalize(score)) : capitalize(score)
}

function descriptionLabel(d: string, locale: Locale) {
  return locale === "en" ? (DESCRIPTION_EN[d.toLowerCase()] ?? d) : capitalize(d)
}

const M = defineMessages({
  en: {
    title: "Credit score",
    intro:
      "From the credit bureau, by VAT number. It helps your review: it never approves or rejects a company by itself.",
    notSetUp:
      "Credit scoring isn't set up on this server. See DEPLOY.md, “Company credit scoring”.",
    demo: "Demo data",
    demoHint: "Made-up results from the development stub, not a real credit bureau.",
    runCheck: "Run new check",
    fullReport: "Full report",
    fullReportTitle: "Get the full report?",
    fullReportBody:
      "The full report adds 12 months of history and costs more with the credit bureau than a standard check.",
    getReport: "Get report",
    checkDone: "Credit check done",
    checking: "Checking with the credit bureau…",
    never: "No credit check yet.",
    notFound:
      "The credit bureau has no data for this VAT number. New companies and sole traders are often not rated yet.",
    failed: "The check failed",
    tryAgain: "Run it again; if it keeps failing, check the provider account.",
    riskClass: "Risk class",
    rating: "Rating",
    ratingScale: "A = low risk · B = medium · C = high",
    notRated: "Not rated",
    severity: "Risk severity",
    severityScale: (n: number) => `${n} on a scale from 1 (low) to 990 (high)`,
    creditLimit: "Estimated credit limit",
    noLimit: "Not estimated",
    checkedOn: (at: string, level: string) => `Checked ${at} · ${level}`,
    levels: { advanced: "standard check", top: "full report" } as Record<CreditLevel, string>,
    automatic: "automatic at registration",
    by: (name: string) => `by ${name}`,
    history: "Last 12 months",
    month: "Month",
    events: "What changed",
    earlier: (n: number) => `Earlier checks (${n})`,
    statuses: {
      pending: "Checking",
      completed: "Done",
      not_found: "No data",
      failed: "Failed",
    } as Record<CreditCheck["status"], string>,
  },
  it: {
    title: "Affidabilità creditizia",
    intro:
      "Dalla centrale rischi, tramite partita IVA. Aiuta la tua valutazione: non approva né rifiuta un'azienda da sola.",
    notSetUp:
      "La valutazione dell'affidabilità non è configurata su questo server. Vedi DEPLOY.md, “Company credit scoring”.",
    demo: "Dati dimostrativi",
    demoHint: "Risultati inventati dallo stub di sviluppo, non da una vera centrale rischi.",
    runCheck: "Nuova verifica",
    fullReport: "Report completo",
    fullReportTitle: "Richiedere il report completo?",
    fullReportBody:
      "Il report completo aggiunge 12 mesi di storico e costa più di una verifica standard presso la centrale rischi.",
    getReport: "Richiedi il report",
    checkDone: "Verifica completata",
    checking: "Verifica in corso con la centrale rischi…",
    never: "Ancora nessuna verifica.",
    notFound:
      "La centrale rischi non ha dati per questa partita IVA. Le aziende nuove e le ditte individuali spesso non sono ancora valutate.",
    failed: "La verifica non è riuscita",
    tryAgain: "Riprova; se continua a non riuscire, controlla l'account del fornitore.",
    riskClass: "Classe di rischio",
    rating: "Rating",
    ratingScale: "A = rischio basso · B = medio · C = alto",
    notRated: "Non valutata",
    severity: "Gravità del rischio",
    severityScale: (n: number) => `${n} su una scala da 1 (basso) a 990 (alto)`,
    creditLimit: "Fido stimato",
    noLimit: "Non stimato",
    checkedOn: (at: string, level: string) => `Verificata il ${at} · ${level}`,
    levels: { advanced: "verifica standard", top: "report completo" } as Record<
      CreditLevel,
      string
    >,
    automatic: "automatica alla registrazione",
    by: (name: string) => `da ${name}`,
    history: "Ultimi 12 mesi",
    month: "Mese",
    events: "Cosa è cambiato",
    earlier: (n: number) => `Verifiche precedenti (${n})`,
    statuses: {
      pending: "In corso",
      completed: "Completata",
      not_found: "Nessun dato",
      failed: "Non riuscita",
    } as Record<CreditCheck["status"], string>,
  },
})

/** Small traffic-light badge for lists: risk class colour and rating. */
export function CreditBadge({ credit }: { credit: CreditSummary | null }) {
  const t = useMessages(M)
  const locale = useLocale()
  if (!credit) return <span className="text-faint">—</span>
  if (credit.status !== "completed")
    return (
      <Badge tone={credit.status === "failed" ? "bad" : "neutral"}>
        {t.statuses[credit.status]}
      </Badge>
    )
  return (
    <Badge tone={riskTone(credit.riskScore)} className="gap-1.5">
      <span
        aria-hidden
        className="size-2 rounded-full"
        style={{ background: SCORE_COLOR[credit.riskScore ?? ""] ?? "#9aa0a6" }}
      />
      {credit.riskScore ? scoreLabel(credit.riskScore, locale) : "—"}
      {credit.rating && credit.rating !== "ND" && ` · ${credit.rating}`}
    </Badge>
  )
}

/** Who asked for a check. Only standard checks run by themselves, at registration. */
function requester(c: CreditCheck, t: (typeof M)["en"]) {
  if (c.requestedBy) return t.by(c.requestedBy.name)
  return c.level === "advanced" ? t.automatic : null
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-border rounded-xl border p-4">
      <div className="text-muted-foreground mb-1.5 text-[0.82rem] font-medium">{label}</div>
      {children}
    </div>
  )
}

function CheckResult({ c }: { c: CreditCheck }) {
  const t = useMessages(M)
  const locale = useLocale()
  const { eurWhole, localDateTime } = useFormat()
  const who = requester(c, t)

  const meta = (
    <Small className="mt-3">
      {t.checkedOn(localDateTime(c.completedAt ?? c.createdAt), t.levels[c.level])}
      {who && ` · ${who}`}
    </Small>
  )

  if (c.status === "pending")
    return (
      <Alert tone="info" size="sm">
        {t.checking}
      </Alert>
    )
  if (c.status === "not_found")
    return (
      <>
        <Alert size="sm">{t.notFound}</Alert>
        {meta}
      </>
    )
  if (c.status === "failed")
    return (
      <>
        <Alert tone="bad" size="sm" title={t.failed}>
          {c.error} {t.tryAgain}
        </Alert>
        {meta}
      </>
    )

  const ratingIndex = RATINGS.indexOf(c.rating as (typeof RATINGS)[number])
  const severityPct = c.riskSeverity === null ? null : Math.min(100, (c.riskSeverity / 990) * 100)
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label={t.riskClass}>
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-4 shrink-0 rounded-full"
              style={{ background: SCORE_COLOR[c.riskScore ?? ""] ?? "#9aa0a6" }}
            />
            <b className="text-[1.15rem]">{c.riskScore ? scoreLabel(c.riskScore, locale) : "—"}</b>
          </div>
          {c.riskDescription && (
            <Small className="mt-1">{descriptionLabel(c.riskDescription, locale)}</Small>
          )}
        </Metric>
        <Metric label={t.rating}>
          <b className="text-[1.15rem]">{c.rating && c.rating !== "ND" ? c.rating : t.notRated}</b>
          <div className="mt-2 flex gap-0.5" aria-hidden>
            {RATINGS.map((r, i) => (
              <span
                key={r}
                title={r}
                className={cn(
                  "h-2 flex-1 rounded-sm",
                  i < 3 ? "bg-ok/25" : i < 6 ? "bg-warn/25" : "bg-bad/25",
                  i === ratingIndex && (i < 3 ? "bg-ok" : i < 6 ? "bg-warn" : "bg-bad")
                )}
              />
            ))}
          </div>
          <Small className="mt-1.5 text-[0.78rem]">{t.ratingScale}</Small>
        </Metric>
        <Metric label={t.severity}>
          <b className="text-[1.15rem] tabular-nums">{c.riskSeverity ?? "—"}</b>
          {severityPct !== null && (
            <>
              <div className="bg-muted relative mt-2 h-2 rounded-full">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#1a8a4a] via-[#e8b400] to-[#c4231a]"
                  style={{ width: `${Math.max(2, severityPct)}%` }}
                />
              </div>
              <Small className="mt-1.5 text-[0.78rem]">{t.severityScale(c.riskSeverity!)}</Small>
            </>
          )}
        </Metric>
        <Metric label={t.creditLimit}>
          <b className="text-[1.15rem] tabular-nums">
            {c.creditLimit === null ? t.noLimit : eurWhole(c.creditLimit)}
          </b>
        </Metric>
      </div>
      {meta}
      {c.history && c.history.riskScore.length > 0 && <History c={c} />}
    </>
  )
}

/** Monthly series of a full report, newest first. */
function History({ c }: { c: CreditCheck }) {
  const t = useMessages(M)
  const locale = useLocale()
  const { eurWhole } = useFormat()
  const h = c.history!
  const months = [
    ...new Set([...h.riskScore, ...h.rating, ...h.creditLimit].map((x) => x.month)),
  ].sort((a, b) => b.localeCompare(a))
  const at = <T extends { month: string }>(xs: T[], m: string) => xs.find((x) => x.month === m)
  const monthName = (m: string) =>
    new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
      month: "short",
      year: "numeric",
    }).format(new Date(`${m}-01T12:00:00`))
  const maxLimit = Math.max(1, ...h.creditLimit.map((x) => x.value))

  return (
    <div className="mt-5">
      <h4 className="mb-2">{t.history}</h4>
      {h.note && (
        <Small className="mb-3">
          <b className="text-foreground">{t.events}:</b> {h.note.events.join(", ")}
        </Small>
      )}
      <div className="border-border overflow-x-auto rounded-xl border">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t.month}</th>
              <th>{t.riskClass}</th>
              <th>{t.rating}</th>
              <th>{t.creditLimit}</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => {
              const s = at(h.riskScore, m)
              const r = at(h.rating, m)
              const l = at(h.creditLimit, m)
              return (
                <tr key={m}>
                  <td className="whitespace-nowrap">{monthName(m)}</td>
                  <td>
                    {s ? (
                      <span className="inline-flex items-center gap-2">
                        <span
                          aria-hidden
                          className="size-2.5 rounded-full"
                          style={{ background: SCORE_COLOR[s.score] ?? "#9aa0a6" }}
                        />
                        {scoreLabel(s.score, locale)}
                        {s.description && (
                          <span className="text-muted-foreground text-[0.85rem]">
                            · {descriptionLabel(s.description, locale)}
                          </span>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{r?.rating ?? "—"}</td>
                  <td className="min-w-[180px]">
                    {l ? (
                      <span className="flex items-center gap-2">
                        <span className="w-20 shrink-0 tabular-nums">{eurWhole(l.value)}</span>
                        <span
                          aria-hidden
                          className="bg-primary h-1.5 rounded-full"
                          style={{ width: `${Math.max(4, (l.value / maxLimit) * 100)}px` }}
                        />
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** The credit score card on an admin's company page. */
export function CreditPanel({ companyId }: { companyId: string }) {
  const t = useMessages(M)
  const { localDateTime } = useFormat()
  const qc = useQueryClient()
  const confirm = useConfirm()
  const key = ["admin", "credit", companyId]
  const q = useQuery({
    queryKey: key,
    queryFn: () => api.get<CreditChecksResponse>(`/api/admin/companies/${companyId}/credit-checks`),
    // The automatic check after registration may still be running.
    refetchInterval: (query) =>
      query.state.data?.items.some((c) => c.status === "pending") ? 2000 : false,
  })
  const run = useMutation({
    mutationFn: (level: CreditLevel) =>
      api.post<CreditCheck>(`/api/admin/companies/${companyId}/credit-checks`, { level }),
    onSuccess: () => {
      toast.success(t.checkDone)
      void qc.invalidateQueries({ queryKey: ["admin"] })
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <Card className="mb-4">
      <QueryView query={q} rows={2}>
        {({ enabled, provider, items }) => {
          const [latest, ...earlier] = items
          return (
            <>
              <PanelTitle
                icon={Gauge}
                aside={
                  enabled && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={run.isPending}
                        onClick={() => run.mutate("advanced")}
                      >
                        <RefreshCw aria-hidden className={cn(run.isPending && "animate-spin")} />
                        {t.runCheck}
                      </Button>
                      <Button
                        size="sm"
                        disabled={run.isPending}
                        onClick={async () => {
                          const ok = await confirm({
                            title: t.fullReportTitle,
                            body: t.fullReportBody,
                            confirmLabel: t.getReport,
                          })
                          if (ok) run.mutate("top")
                        }}
                      >
                        <FileSearch aria-hidden /> {t.fullReport}
                      </Button>
                    </div>
                  )
                }
              >
                <span className="inline-flex flex-wrap items-center gap-2">
                  {t.title}
                  {provider === "stub" && (
                    <Badge tone="warn" title={t.demoHint}>
                      {t.demo}
                    </Badge>
                  )}
                </span>
              </PanelTitle>
              <Small className="mb-4">{t.intro}</Small>
              {!enabled && !items.length ? (
                <Alert size="sm">{t.notSetUp}</Alert>
              ) : latest ? (
                <CheckResult c={latest} />
              ) : (
                <Small>{t.never}</Small>
              )}
              {earlier.length > 0 && (
                <details className="mt-4 text-sm">
                  <summary className="cursor-pointer font-medium">
                    {t.earlier(earlier.length)}
                  </summary>
                  <ul className="divide-border mt-2 list-none divide-y p-0">
                    {earlier.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center gap-2 py-2">
                        <span className="text-muted-foreground w-36 shrink-0">
                          {localDateTime(c.createdAt)}
                        </span>
                        <span className="w-32 shrink-0">{t.levels[c.level]}</span>
                        <CreditBadge credit={c} />
                        <span className="text-muted-foreground">{requester(c, t)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )
        }}
      </QueryView>
    </Card>
  )
}
