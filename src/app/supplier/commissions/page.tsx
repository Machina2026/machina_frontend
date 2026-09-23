import type { Metadata } from "next"

import { SupplierCommissions } from "@/features/supplier/lists"

export const metadata: Metadata = { title: "Commissions and plan" }

export default function Page() {
  return <SupplierCommissions />
}
