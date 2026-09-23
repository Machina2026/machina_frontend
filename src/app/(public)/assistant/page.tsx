import type { Metadata } from "next"

import { AssistantView } from "@/features/public/assistant"

export const metadata: Metadata = { title: "Describe your job" }

export default function AssistantPage() {
  return <AssistantView />
}
