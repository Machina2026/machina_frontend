import type { Metadata } from "next"

import { SupplierDocuments } from "@/features/supplier/lists"

export const metadata: Metadata = { title: "Documents and draft invoices" }

export default function Page() {
  return <SupplierDocuments />
}
