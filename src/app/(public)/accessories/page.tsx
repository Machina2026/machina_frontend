import type { Metadata } from "next"

import { AccessoriesView } from "@/features/public/accessories"

export const metadata: Metadata = { title: "Accessories" }

export default function AccessoriesPage() {
  return <AccessoriesView />
}
