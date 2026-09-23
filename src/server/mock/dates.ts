// Local-time date helpers. Dates are ISO "YYYY-MM-DD" strings and timestamps
// "YYYY-MM-DDTHH:MM:SS" (no timezone), matching the original demo backend.

const pad = (n: number) => String(n).padStart(2, "0")

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function today(): string {
  return isoDate(new Date())
}

export function now(): string {
  const d = new Date()
  return `${isoDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** Noon avoids DST edge cases when adding days. */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d, 12)
}

export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = parseDate(value)
  return isoDate(d) === value
}

export function addDays(iso: string, n: number): string {
  const d = parseDate(iso)
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

export function calendarDays(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000) + 1
}

/** Monday to Friday, inclusive. */
export function workingDays(from: string, to: string): number {
  let n = 0
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const day = parseDate(d).getDay()
    if (day !== 0 && day !== 6) n++
  }
  return n
}

/** Timestamp `offset` days from today at `hour`:00, for seed data. */
export function timestampAt(offset: number, hour = 10): string {
  return `${addDays(today(), offset)}T${pad(hour)}:00:00`
}
