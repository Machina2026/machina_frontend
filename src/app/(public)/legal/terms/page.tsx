import { PageHead } from "@/components/app/bits"
import { Alert } from "@/components/ui/alert"
import { defineMessages } from "@/i18n/messages"
import { getMessages, pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("terms")

const M = defineMessages({
  en: {
    title: "Terms of service",
    pending: "Not yet written",
    body: "The terms of service will be drafted by legal counsel before launch.",
  },
  it: {
    title: "Termini di servizio",
    pending: "Non ancora redatti",
    body: "I termini di servizio saranno redatti dal consulente legale prima del lancio.",
  },
})

export default async function TermsPage() {
  const t = await getMessages(M)
  return (
    <>
      <PageHead title={t.title} />
      <Alert tone="warn" title={t.pending}>
        {t.body}
      </Alert>
    </>
  )
}
