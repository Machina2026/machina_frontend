import type { Metadata } from "next"

import { SupplierOrders } from "@/features/supplier/lists"

export const metadata: Metadata = { title: "Orders" }

export default function Page() {
  return <SupplierOrders />
}
