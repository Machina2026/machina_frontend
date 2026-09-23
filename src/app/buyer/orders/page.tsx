import type { Metadata } from "next"

import { BuyerOrders } from "@/features/buyer/lists"

export const metadata: Metadata = { title: "Orders" }

export default function Page() {
  return <BuyerOrders />
}
