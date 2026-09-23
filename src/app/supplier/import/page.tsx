import type { Metadata } from "next"

import { CsvImport } from "@/features/supplier/equipment"

export const metadata: Metadata = { title: "Import CSV" }

export default function Page() {
  return <CsvImport />
}
