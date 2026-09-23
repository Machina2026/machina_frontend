import Link from "next/link"

export function DemoBar() {
  return (
    <div className="no-print bg-ink text-ink-foreground/80 flex flex-wrap items-center justify-center gap-3 px-4 py-1.5 text-center text-[0.8rem]">
      <span>
        <b className="text-gold font-semibold tracking-[0.12em]">DEMO</b>
        <span className="text-ink-foreground/30 mx-2">|</span>
        <span className="hidden sm:inline">
          Companies, prices and availability are fictitious. Demo sign-in is not real
          authentication.
        </span>
        <span className="sm:hidden">Fictitious data · sign-in is not real</span>
      </span>
      <Link
        href="/demo"
        className="text-ink-foreground decoration-gold/60 hover:decoration-gold underline"
      >
        Demo tools
      </Link>
    </div>
  )
}

export function Logo({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <Link
      href="/"
      aria-label="Machina Rent, home"
      className={`flex items-baseline gap-2 no-underline hover:no-underline ${tone === "light" ? "text-ink-foreground" : "text-foreground"}`}
    >
      <span className="font-heading text-[1.15rem] font-semibold tracking-[0.14em] sm:text-[1.35rem] sm:tracking-[0.18em]">
        MACHINA
      </span>
      <span className="text-primary hidden text-[0.66rem] font-semibold tracking-[0.3em] sm:inline">
        RENT
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
      ["/demo", "Demo tools"],
      ["/legal/terms", "Terms"],
      ["/legal/privacy", "Privacy"],
    ],
  ],
]

export function SiteFooter() {
  return (
    <footer className="no-print bg-ink text-ink-foreground mt-auto">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-4 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo tone="light" />
          <p className="text-ink-foreground/70 mt-4 max-w-sm text-[0.92rem] leading-relaxed">
            Construction equipment rental in Turin and Piedmont. One request, several rental
            companies, every quote and order in one place.
          </p>
        </div>
        {FOOTER_LINKS.map(([title, links]) => (
          <nav key={title} aria-label={title}>
            <div className="text-gold mb-3 text-[0.72rem] font-semibold tracking-[0.14em] uppercase">
              {title}
            </div>
            <ul className="m-0 list-none space-y-2 p-0">
              {links.map(([href, label]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-ink-foreground/80 text-[0.92rem] no-underline hover:text-white"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="text-ink-foreground/55 mx-auto max-w-[1240px] px-4 py-5 text-[0.82rem]">
          © {new Date().getFullYear()} Machina Rent · Demo prototype: no real data, nothing is sent
          to tax systems.
        </div>
      </div>
    </footer>
  )
}
