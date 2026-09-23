import type { Metadata } from "next"

import { PageHead } from "@/components/app/bits"
import { Alert } from "@/components/ui/alert"

export const metadata: Metadata = { title: "Privacy policy" }

export default function PrivacyPage() {
  return (
    <>
      <PageHead title="Privacy policy" />
      <Alert tone="warn" title="Not yet written">
        The privacy policy (GDPR: consent, retention, export and deletion) will be drafted by legal
        counsel before launch. This demo stores data in server memory only and uses fictitious
        companies.
      </Alert>
    </>
  )
}
