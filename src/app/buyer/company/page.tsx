import type { Metadata } from "next"

import { BuyerCompany } from "@/features/buyer/company"

export const metadata: Metadata = { title: "Company and sites" }

export default function Page() {
  return <BuyerCompany />
}
