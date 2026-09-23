import type { Metadata } from "next"

import { RequestDraftView } from "@/features/public/request-draft"

export const metadata: Metadata = { title: "Request" }

export default function RequestPage() {
  return <RequestDraftView />
}
