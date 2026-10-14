import * as React from "react"

import { cn } from "@/lib/utils"

/** The site's content width. Header, pages and footer all line up on it. */
export function Container({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-[1240px] px-4 sm:px-6", className)} {...props} />
}
