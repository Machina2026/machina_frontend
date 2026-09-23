import type { Metadata } from "next"

import { EquipmentList } from "@/features/supplier/equipment"

export const metadata: Metadata = { title: "Equipment catalogue" }

export default function Page() {
  return <EquipmentList />
}
