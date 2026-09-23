import type { Metadata } from "next"

import { SupplierChanges } from "@/features/supplier/lists"

export const metadata: Metadata = { title: "Rental changes" }

export default function Page() {
  return <SupplierChanges />
}
