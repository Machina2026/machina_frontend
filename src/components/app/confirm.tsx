"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Modal, ModalActions } from "@/components/ui/modal"
import { useCommon } from "@/i18n/common"

type ConfirmOptions = {
  title: string
  body?: React.ReactNode
  confirmLabel?: string
  danger?: boolean
}

const ConfirmContext = React.createContext<(opts: ConfirmOptions) => Promise<boolean>>(
  async () => false
)

/** Promise-based confirmation dialog: `if (await confirm({...})) doIt()`. */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<
    (ConfirmOptions & { resolve: (ok: boolean) => void }) | null
  >(null)

  const confirm = React.useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ ...opts, resolve })),
    []
  )
  const c = useCommon()
  const close = (ok: boolean) => {
    state?.resolve(ok)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={state !== null}
        onOpenChange={(open) => !open && close(false)}
        title={state?.title ?? ""}
      >
        {state?.body && <div className="text-[0.92rem]">{state.body}</div>}
        <ModalActions>
          <Button onClick={() => close(false)}>{c.cancel}</Button>
          <Button variant={state?.danger ? "danger" : "primary"} onClick={() => close(true)}>
            {state?.confirmLabel ?? c.confirm}
          </Button>
        </ModalActions>
      </Modal>
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => React.useContext(ConfirmContext)
