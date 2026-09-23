import type { Metadata } from "next"

import { PageHead } from "@/components/app/bits"
import { Alert } from "@/components/ui/alert"

export const metadata: Metadata = { title: "Terms of service" }

export default function TermsPage() {
  return (
    <>
      <PageHead title="Terms of service" />
      <Alert tone="warn" title="Not yet written">
        The terms of service will be drafted by legal counsel before launch. This demo has no
        binding terms.
      </Alert>
    </>
  )
}
