import type { Metadata } from "next"

import { EmptyState } from "@/components/states/empty-state"

export const metadata: Metadata = { title: "Scheduled maintenance" }

export default function MaintenancePage() {
  return (
    <EmptyState
      title="Scheduled maintenance"
      description="Machina is being updated. Please check back shortly."
    />
  )
}
