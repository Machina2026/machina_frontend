import type { Locale } from "./config"

/**
 * A component's texts in every language. Both sides must have the same keys
 * and the same function signatures, so a missing translation fails to compile.
 * Texts with values in them are functions: `(n: number) => \`${n} offers\``.
 */
export type Messages<T> = Record<Locale, T>

export function defineMessages<T>(messages: { en: T; it: NoInfer<T> }): Messages<T> {
  return messages
}

/** "1 model" / "3 models": picks the form for `n`. Same rule in both languages. */
export const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)
