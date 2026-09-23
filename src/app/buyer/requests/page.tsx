import type { Metadata } from "next"

import { BuyerRequests } from "@/features/buyer/lists"

export const metadata: Metadata = { title: "Requests and quotes" }

export default function Page() {
  return <BuyerRequests />
}
