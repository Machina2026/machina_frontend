import type { Metadata } from "next"

import { SupplierPricing } from "@/features/supplier/equipment"

export const metadata: Metadata = { title: "Prices, accessories and terms" }

export default function Page() {
  return <SupplierPricing />
}
