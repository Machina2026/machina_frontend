import type { Metadata } from "next"

import { BuyerDocuments } from "@/features/buyer/lists"

export const metadata: Metadata = { title: "Documents and invoices" }

export default function Page() {
  return <BuyerDocuments />
}
