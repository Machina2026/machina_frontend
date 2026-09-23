/** Flatten Next.js search params to single string values (first value wins). */
export function toQuery(
  params: Record<string, string | string[] | undefined>
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) {
    const value = Array.isArray(v) ? v[0] : v
    if (value !== undefined) out[k] = value
  }
  return out
}
