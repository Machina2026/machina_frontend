"use client"

import { Dialog } from "@base-ui/react/dialog"
import * as React from "react"

import { cn } from "@/lib/utils"

type ModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  wide?: boolean
  children?: React.ReactNode
}

/** Accessible modal dialog (focus trap, Esc to close) built on Base UI. */
export function Modal({ open, onOpenChange, title, description, wide, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="bg-ink/45 fixed inset-0 z-50 backdrop-blur-[2px] transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          className={cn(
            "bg-card fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border p-5 shadow-xl transition-[scale,opacity] data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0",
            wide ? "max-w-2xl" : "max-w-lg"
          )}
        >
          <Dialog.Title className="font-heading mb-1 text-[1.35rem] font-semibold">
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description className="text-muted-foreground mb-3 text-sm">
              {description}
            </Dialog.Description>
          )}
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function ModalActions({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 flex flex-wrap justify-end gap-2">{children}</div>
}
