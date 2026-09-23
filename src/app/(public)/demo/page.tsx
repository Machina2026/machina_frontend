import type { Metadata } from "next"

import { DemoToolsView } from "@/features/public/demo-tools"

export const metadata: Metadata = { title: "Demo tools" }

export default function DemoPage() {
  return <DemoToolsView />
}
