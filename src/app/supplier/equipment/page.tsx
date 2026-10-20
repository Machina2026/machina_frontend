import { EquipmentList } from "@/features/supplier/equipment"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("equipment")

export default function Page() {
  return <EquipmentList />
}
