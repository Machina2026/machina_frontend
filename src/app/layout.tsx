// Fonts are bundled locally (geist package) so builds don't depend on Google Fonts.
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import type { Metadata } from "next"

import { SiteFooter } from "@/components/layout/site-chrome"
import { SiteHeader } from "@/components/layout/site-header"
import { getLocale } from "@/i18n/server"

import "./globals.css"

import { Providers } from "./providers"

const DESCRIPTION = {
  en: "Construction equipment rental in Turin and Piedmont: compare offers from several rental companies, send one request, manage quotes and orders.",
  it: "Noleggio di macchine edili a Torino e in Piemonte: confronta le offerte di più noleggiatori, invia una sola richiesta, gestisci preventivi e ordini.",
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { default: "Machina Rent", template: "%s · Machina Rent" },
    description: DESCRIPTION[await getLocale()],
  }
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale()
  return (
    <html
      lang={locale}
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col overflow-x-clip">
        <Providers locale={locale}>
          <SiteHeader />
          <main className="flex flex-1 flex-col">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  )
}
