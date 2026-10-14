import Link from "next/link"

import { Container } from "./container"

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
  return (
    <Link
      href="/"
      aria-label="Machina Rent, home"
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

const FOOTER_LINKS: [string, [string, string][]][] = [
  [
    "Rent",
    [
      ["/catalog", "Catalogue"],
      ["/assistant", "Describe your job"],
      ["/accessories", "Accessories"],
      ["/request", "Your request"],
    ],
  ],
  [
    "Partners",
    [
      ["/become-a-partner", "Become a partner"],
      ["/register?role=partner", "Register a rental company"],
      ["/login", "Sign in"],
    ],
  ],
  [
    "Machina",
    [
      ["/legal/terms", "Terms"],
      ["/legal/privacy", "Privacy"],
    ],
  ],
]

export function SiteFooter() {
  return (
    <footer className="no-print border-border bg-secondary mt-auto border-t">
      <Container className="grid gap-10 py-14 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="text-muted-foreground mt-4 max-w-xs text-[0.92rem] leading-relaxed">
            Construction equipment rental in Turin and Piedmont. One request, several rental
            companies, every quote and order in one place.
          </p>
        </div>
        {FOOTER_LINKS.map(([title, links]) => (
          <nav key={title} aria-label={title}>
            <div className="mb-3 text-[0.92rem] font-semibold">{title}</div>
            <ul className="m-0 list-none space-y-2.5 p-0">
              {links.map(([href, label]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-muted-foreground hover:text-foreground text-[0.92rem] no-underline hover:no-underline"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
      <div className="border-border border-t">
        <Container className="text-muted-foreground flex flex-wrap justify-between gap-2 py-5 text-[0.84rem]">
          <span>© {new Date().getFullYear()} Machina Rent</span>
          <span>Prices shown exclude VAT</span>
        </Container>
      </div>
    </footer>
  )
}
