import { ModelDetailView } from "@/features/public/model-detail"

import { toQuery } from "@/lib/search-params"

export default async function ModelPage({ params, searchParams }: PageProps<"/models/[id]">) {
  const { id } = await params
  return <ModelDetailView id={id} query={toQuery(await searchParams)} />
}
