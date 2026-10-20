import { AssistantView } from "@/features/public/assistant"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("describeJob")

export default function AssistantPage() {
  return <AssistantView />
}
