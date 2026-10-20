"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { Toaster } from "sonner"

import { ConfirmProvider } from "@/components/app/confirm"
import { I18nProvider } from "@/i18n/client"
import type { Locale } from "@/i18n/config"

export function Providers({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  // One client per browser session; created in state so it survives re-renders.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 10_000, retry: 1, refetchOnWindowFocus: true },
        },
      })
  )
  return (
    <I18nProvider locale={locale}>
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>{children}</ConfirmProvider>
        <Toaster position="bottom-center" richColors closeButton />
      </QueryClientProvider>
    </I18nProvider>
  )
}
