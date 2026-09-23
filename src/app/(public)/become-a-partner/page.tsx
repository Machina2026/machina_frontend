import type { Metadata } from "next"

import { PartnerInfoView } from "@/features/public/partner-info"

export const metadata: Metadata = { title: "Become a partner" }

export default function BecomeAPartnerPage() {
  return <PartnerInfoView />
}
