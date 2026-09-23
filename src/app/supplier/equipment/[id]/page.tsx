import { EquipmentEditor } from "@/features/supplier/equipment"

/** `/supplier/equipment/new` creates a machine; any other id edits that offer. */
export default async function Page({ params }: PageProps<"/supplier/equipment/[id]">) {
  const { id } = await params
  return <EquipmentEditor id={id} />
}
