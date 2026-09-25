import Link from "next/link"

import { FooterCta } from "./footer-cta"

export function DemoBar() {
  return (
    <div className="no-print bg-ink text-ink-foreground/80 flex flex-wrap items-center justify-center gap-3 px-4 py-1.5 text-center text-[0.8rem]">
      <span>
        <b className="text-sun font-semibold tracking-[0.12em]">DEMO</b>
        <span className="text-ink-foreground/30 mx-2">|</span>
        <span className="hidden sm:inline">
          Companies, prices and availability are fictitious. Demo sign-in is not real
          authentication.
        </span>
        <span className="sm:hidden">Fictitious data · sign-in is not real</span>
      </span>
      <Link
        href="/demo"
        className="text-ink-foreground decoration-sun/60 hover:decoration-sun underline"
      >
        Demo tools
      </Link>
    </div>
  )
}

/** The "M" mark from the favicon, as an inline square. */
export function LogoMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className={className}>
      <defs>
        <linearGradient id="lm-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a2d33" />
          <stop offset="1" stopColor="#121316" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#lm-bg)" />
      <path
        d="M8 23 L8 10 L16 18 L24 10 L24 23"
        stroke="#ec7430"
        strokeWidth="3.4"
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <rect x="6" y="26" width="20" height="2" rx="1" fill="#f5b52e" />
    </svg>
  )
}

export function Logo({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <Link
      href="/"
      aria-label="Machina Rent, home"
      className={`flex items-center gap-2.5 no-underline hover:no-underline ${tone === "light" ? "text-ink-foreground" : "text-foreground"}`}
    >
      <LogoMark className="size-9 shrink-0" />
      <span className="flex flex-col leading-none">
        <span className="font-heading text-[1.1rem] font-semibold tracking-[0.14em] sm:text-[1.22rem]">
          MACHINA
        </span>
        <span className="text-primary mt-1 hidden text-[0.6rem] font-bold tracking-[0.42em] sm:block">
          RENT
        </span>
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
    <footer className="no-print bg-ink text-ink-foreground relative mt-auto overflow-hidden">
      <div aria-hidden className="hazard h-1.5 opacity-90" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_100%_0%,rgb(236_116_48/0.16),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-[1240px] px-4">
        <FooterCta />
        <div className="grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo tone="light" />
            <p className="text-ink-foreground/65 mt-4 max-w-sm text-[0.92rem] leading-relaxed">
              Construction equipment rental in Turin and Piedmont. One request, several rental
              companies, every quote and order in one place.
            </p>
          </div>
          {FOOTER_LINKS.map(([title, links]) => (
            <nav key={title} aria-label={title}>
              <div className="text-sun mb-3 text-[0.72rem] font-semibold tracking-[0.14em] uppercase">
                {title}
              </div>
              <ul className="m-0 list-none space-y-2 p-0">
                {links.map(([href, label]) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-ink-foreground/75 text-[0.92rem] no-underline hover:text-white"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="relative border-t border-white/10">
        <div className="text-ink-foreground/50 mx-auto max-w-[1240px] px-4 py-5 text-[0.82rem]">
          © {new Date().getFullYear()} Machina Rent · Demo prototype: no real data, nothing is sent
          to tax systems.
        </div>
      </div>
    </footer>
  )
}
