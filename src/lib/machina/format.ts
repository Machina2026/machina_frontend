// Formatting for the UI. Money is EUR; dates are shown day/month/year.

const eurFmt = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" })

export const eur = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n) ? "—" : eurFmt.format(n)

const eurWholeFmt = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

/** Rounded euros for headline prices ("€250"); use `eur` wherever the cents matter. */
export const eurWhole = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n) ? "—" : eurWholeFmt.format(n)

export const num = (n: number | null | undefined, maxDecimals = 2) =>
  n === null || n === undefined
    ? "—"
    : Number(n).toLocaleString("en-GB", { maximumFractionDigits: maxDecimals })

export const pct = (rate: number) => `${num(rate * 100, 1)}%`

/** "2026-09-24" or "2026-09-24T10:00:00" → "24/09/2026". */
export function date(iso: string | null | undefined) {
  if (!iso) return "—"
  const [y, m, d] = iso.slice(0, 10).split("-")
  return `${d}/${m}/${y}`
}

export const dateTime = (iso: string | null | undefined) =>
  iso ? `${date(iso)} ${iso.slice(11, 16)}` : "—"

const localFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short" })
const localDateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "short" })

/** The day of a UTC timestamp from the Machina API, in the viewer's time zone. */
export const localDate = (iso: string | null | undefined) =>
  iso ? localDateFmt.format(new Date(iso)) : "—"

/** A UTC timestamp from the Machina API ("2026-10-07T05:06:00.000Z") in the viewer's time zone. */
export const localDateTime = (iso: string | null | undefined) =>
  iso ? localFmt.format(new Date(iso)).replace(",", "") : "—"

const pad = (n: number) => String(n).padStart(2, "0")
const localIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const today = () => localIso(new Date())

export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return localIso(d)
}

/** Calendar days, both ends included. */
export const daysBetween = (from: string, to: string) =>
  Math.round(
    (new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86_400_000
  ) + 1

export const stripDemo = (name: string) => name.replace(" (demo)", "")
