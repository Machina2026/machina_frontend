import { PageHead } from "@/components/app/bits"
import { Alert } from "@/components/ui/alert"
import { defineMessages } from "@/i18n/messages"
import { getMessages, pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("privacy")

const M = defineMessages({
  en: {
    title: "Privacy policy",
    pending: "Not yet written",
    body: "The privacy policy (GDPR: consent, retention, export and deletion) will be drafted by legal counsel before launch.",
  },
  it: {
    title: "Informativa sulla privacy",
    pending: "Non ancora redatta",
    body: "L'informativa sulla privacy (GDPR: consenso, conservazione, esportazione e cancellazione) sarà redatta dal consulente legale prima del lancio.",
  },
})

export default async function PrivacyPage() {
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
