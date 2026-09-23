import type { Metadata } from "next"

import { SupplierOverview } from "@/features/supplier/lists"

export const metadata: Metadata = { title: "Rental company area" }

export default function Page() {
  return <SupplierOverview />
}
