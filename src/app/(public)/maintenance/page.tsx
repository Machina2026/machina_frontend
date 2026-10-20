import { EmptyState } from "@/components/states/empty-state"
import { defineMessages } from "@/i18n/messages"
import { getMessages, pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("maintenance")

const M = defineMessages({
  en: {
    title: "Scheduled maintenance",
    body: "Machina is being updated. Please check back shortly.",
  },
  it: {
    title: "Manutenzione programmata",
    body: "Machina è in aggiornamento. Riprova tra poco.",
  },
})

export default async function MaintenancePage() {
  const t = await getMessages(M)
  return <EmptyState title={t.title} description={t.body} />
}
