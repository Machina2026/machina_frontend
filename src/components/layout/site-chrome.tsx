import Link from "next/link"

export function DemoBar() {
  return (
    <div className="no-print bg-ink text-ink-foreground flex flex-wrap items-center justify-center gap-3 px-4 py-1.5 text-center text-[0.8rem]">
      <span>
        <b className="text-[#ffb36b]">DEMO</b> ·{" "}
        <span className="hidden sm:inline">
          Demo version: companies, prices and availability are fictitious. Demo sign-in is not real
          authentication.
        </span>
        <span className="sm:hidden">Fictitious data · sign-in is not real</span>
      </span>
      <Link href="/demo" className="text-[#ffd2a8] underline">
        Demo tools
      </Link>
    </div>
  )
}

export function Logo() {
  return (
    <Link
      href="/"
      className="text-foreground flex items-baseline gap-1.5 text-[1.1rem] font-extrabold tracking-[0.14em] no-underline hover:no-underline"
    >
      MACHINA <span className="text-primary text-[0.7rem] font-bold tracking-[0.18em]">RENT</span>
    </Link>
  )
}

export function SiteFooter() {
  const links: [string, string][] = [
    ["/catalog", "Catalogue"],
    ["/accessories", "Accessories"],
    ["/assistant", "Describe your job"],
    ["/become-a-partner", "Become a partner"],
    ["/demo", "Demo tools"],
    ["/legal/terms", "Terms"],
    ["/legal/privacy", "Privacy"],
  ]
  return (
    <footer className="no-print bg-card mt-auto border-t">
      <div className="text-muted-foreground mx-auto flex max-w-[1240px] flex-wrap justify-between gap-4 px-4 py-6 text-[0.85rem]">
        <div>
          <b className="text-foreground">MACHINA RENT</b> · Construction equipment rental · Turin
          and Piedmont
          <br />
          Demo prototype: no real data, nothing is sent to tax systems.
        </div>
        <nav className="flex flex-wrap gap-x-3 gap-y-1">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="text-muted-foreground">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
