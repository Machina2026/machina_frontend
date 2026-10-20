import { BuyerCompany } from "@/features/buyer/company"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("companyAndSites")

export default function Page() {
  return <BuyerCompany />
}
