// Fonts are bundled locally (geist package) so builds don't depend on Google Fonts.
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import type { Metadata } from "next"

import { DemoBar, SiteFooter } from "@/components/layout/site-chrome"
import { SiteHeader } from "@/components/layout/site-header"

import "./globals.css"

import { Providers } from "./providers"

export const metadata: Metadata = {
  title: { default: "Machina Rent", template: "%s · Machina Rent" },
  description:
    "Construction equipment rental in Turin and Piedmont: compare offers from several rental companies, send one request, manage quotes and orders. Demo version.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>
          <DemoBar />
          <SiteHeader />
          <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 pt-6 pb-16">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  )
}
