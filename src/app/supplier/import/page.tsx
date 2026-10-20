import { CsvImport } from "@/features/supplier/equipment"
import { pageMetadata } from "@/i18n/server"

export const generateMetadata = pageMetadata("importCsv")

export default function Page() {
  return <CsvImport />
}
