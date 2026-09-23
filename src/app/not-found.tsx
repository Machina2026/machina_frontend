import { SearchX } from "lucide-react"
import Link from "next/link"

import { EmptyState } from "@/components/states/empty-state"
import { buttonVariants } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 items-center py-8">
      <EmptyState
        className="w-full"
        icon={SearchX}
        title="Page not found"
        description="The page you are looking for does not exist or has moved."
        action={
          <Link href="/" className={buttonVariants()}>
            Back to home
          </Link>
        }
      />
    </div>
  )
}
