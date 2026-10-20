import { PartnerInfoView } from "@/features/public/partner-info"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("becomePartner")

export default function BecomeAPartnerPage() {
  return <PartnerInfoView />
}
