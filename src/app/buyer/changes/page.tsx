import type { Metadata } from "next"

import { BuyerChanges } from "@/features/buyer/lists"

export const metadata: Metadata = { title: "Changes to approve" }

export default function Page() {
  return <BuyerChanges />
}
