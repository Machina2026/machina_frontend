import { INTL_LOCALE, type Locale } from "./config"

// Money, numbers and dates in the viewer's language. Money is EUR. Built once
// per language; get them with useFormat() (client) or getFormat() (server).

const DASH = "—"
const missing = (n: number | null | undefined): n is null | undefined =>
  n === null || n === undefined || Number.isNaN(n)

function makeFormat(locale: Locale) {
  const tag = INTL_LOCALE[locale]
  const eurFmt = new Intl.NumberFormat(tag, { style: "currency", currency: "EUR" })
  const eurWholeFmt = new Intl.NumberFormat(tag, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  })
  const numFmts = new Map<number, Intl.NumberFormat>()
  const numFmt = (maxDecimals: number) => {
    let f = numFmts.get(maxDecimals)
    if (!f)
      numFmts.set(
        maxDecimals,
        (f = new Intl.NumberFormat(tag, { maximumFractionDigits: maxDecimals }))
      )
    return f
  }
  const localDateTimeFmt = new Intl.DateTimeFormat(tag, { dateStyle: "short", timeStyle: "short" })
  const localDateFmt = new Intl.DateTimeFormat(tag, { dateStyle: "short" })

  /** "2026-09-24" or "2026-09-24T10:00:00" → "24/09/2026" (day first in both languages). */
  const date = (iso: string | null | undefined) => {
    if (!iso) return DASH
    const [y, m, d] = iso.slice(0, 10).split("-")
    return `${d}/${m}/${y}`
  }

  return {
    locale,
    eur: (n: number | null | undefined) => (missing(n) ? DASH : eurFmt.format(n)),
    /** Rounded euros for headline prices ("€250"); use `eur` wherever the cents matter. */
    eurWhole: (n: number | null | undefined) => (missing(n) ? DASH : eurWholeFmt.format(n)),
    num: (n: number | null | undefined, maxDecimals = 2) =>
      missing(n) ? DASH : numFmt(maxDecimals).format(n),
    pct: (rate: number) => `${numFmt(1).format(rate * 100)}%`,
    date,
    /** Local timestamp from the mock API ("2026-09-24T10:00:00"). */
    dateTime: (iso: string | null | undefined) =>
      iso ? `${date(iso)} ${iso.slice(11, 16)}` : DASH,
    /** The day of a UTC timestamp from the Machina API, in the viewer's time zone. */
    localDate: (iso: string | null | undefined) =>
      iso ? localDateFmt.format(new Date(iso)) : DASH,
    /** A UTC timestamp from the Machina API in the viewer's time zone. */
    localDateTime: (iso: string | null | undefined) =>
      iso ? localDateTimeFmt.format(new Date(iso)).replace(",", "") : DASH,
  }
}

export type Format = ReturnType<typeof makeFormat>

const cache = new Map<Locale, Format>()

export function formatFor(locale: Locale): Format {
  let f = cache.get(locale)
  if (!f) cache.set(locale, (f = makeFormat(locale)))
  return f
}
