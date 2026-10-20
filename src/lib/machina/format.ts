// Date arithmetic and name helpers. Money, numbers and dates shown to people
// depend on the language: use useFormat() from "@/i18n/client".

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
