"use client"

import Link from "next/link"

import { useMessages } from "@/i18n/client"

import { Container } from "./container"
import { LanguageSwitch } from "./language-switch"
import { NAV } from "./nav-text"

/** The "M" mark from the favicon, as an inline square. */
export function LogoMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className={className}>
      <rect width="32" height="32" rx="7" fill="#111316" />
      <path
        d="M8 23 L8 10 L16 18 L24 10 L24 23"
        stroke="#ffc72c"
        strokeWidth="3.6"
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Logo({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const t = useMessages(NAV)
  return (
    <Link
      href="/"
      aria-label={t.home}
      className={`flex items-center gap-2 no-underline hover:no-underline ${tone === "light" ? "text-white" : "text-foreground"}`}
    >
      <LogoMark className="size-8 shrink-0" />
      <span className="text-[1.25rem] leading-none font-extrabold tracking-[-0.03em]">
        machina
        <span className="text-faint font-semibold"> rent</span>
      </span>
    </Link>
  )
}

type NavKey = keyof (typeof NAV)["en"]

const FOOTER_LINKS: [NavKey, [href: string, label: NavKey][]][] = [
  [
    "footerRent",
    [
      ["/catalog", "catalog"],
      ["/assistant", "describeJob"],
      ["/accessories", "accessories"],
      ["/request", "yourRequest"],
    ],
  ],
  [
    "footerPartners",
    [
      ["/become-a-partner", "becomePartner"],
      ["/register?role=partner", "registerPartner"],
      ["/login", "signIn"],
    ],
  ],
  [
    "footerMachina",
    [
      ["/legal/terms", "terms"],
      ["/legal/privacy", "privacy"],
    ],
  ],
]

export function SiteFooter() {
  const t = useMessages(NAV)
  return (
    <footer className="no-print border-border bg-secondary mt-auto border-t">
      <Container className="grid gap-10 py-14 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="text-muted-foreground mt-4 max-w-xs text-[0.92rem] leading-relaxed">
            {t.footerAbout}
          </p>
        </div>
        {FOOTER_LINKS.map(([title, links]) => (
          <nav key={title} aria-label={t[title]}>
            <div className="mb-3 text-[0.92rem] font-semibold">{t[title]}</div>
            <ul className="m-0 list-none space-y-2.5 p-0">
              {links.map(([href, label]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-muted-foreground hover:text-foreground text-[0.92rem] no-underline hover:no-underline"
                  >
                    {t[label]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
      <div className="border-border border-t">
        <Container className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 py-5 text-[0.84rem]">
          <span>
            © {new Date().getFullYear()} Machina Rent · {t.vatNote}
          </span>
          <LanguageSwitch />
        </Container>
      </div>
    </footer>
  )
}
