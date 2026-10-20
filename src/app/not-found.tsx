import { SearchX } from "lucide-react"
import Link from "next/link"

import { EmptyState } from "@/components/states/empty-state"
import { buttonVariants } from "@/components/ui/button"
import { defineMessages } from "@/i18n/messages"
import { getMessages } from "@/i18n/server"

const M = defineMessages({
  en: {
    title: "Page not found",
    body: "The page you are looking for does not exist or has moved.",
    home: "Back to home",
  },
  it: {
    title: "Pagina non trovata",
    body: "La pagina che cerchi non esiste o è stata spostata.",
    home: "Torna alla home",
  },
})

export default async function NotFound() {
  const t = await getMessages(M)
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 items-center px-4 py-16">
      <EmptyState
        className="w-full"
        icon={SearchX}
        title={t.title}
        description={t.body}
        action={
          <Link href="/" className={buttonVariants()}>
            {t.home}
          </Link>
        }
      />
    </div>
  )
}
