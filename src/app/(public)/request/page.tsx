import { RequestDraftView } from "@/features/public/request-draft"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("request")

export default function RequestPage() {
  return <RequestDraftView />
}
