import { Suspense } from "react"

import { SupplierPayouts } from "@/features/supplier/payouts"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("payouts")

export default function Page() {
  // Reads ?from=stripe when Stripe sends the partner back.
  return (
    <Suspense>
      <SupplierPayouts />
    </Suspense>
  )
}
