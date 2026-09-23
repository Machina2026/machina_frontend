import type { Metadata } from "next"

import { BuyerOverview } from "@/features/buyer/lists"

export const metadata: Metadata = { title: "Customer area" }

export default function Page() {
  return <BuyerOverview />
}
