import { AccessoriesView } from "@/features/public/accessories"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("accessories")

export default function AccessoriesPage() {
  return <AccessoriesView />
}
