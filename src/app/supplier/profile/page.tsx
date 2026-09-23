import type { Metadata } from "next"

import { SupplierProfile } from "@/features/supplier/profile"

export const metadata: Metadata = { title: "Company profile" }

export default function Page() {
  return <SupplierProfile />
}
