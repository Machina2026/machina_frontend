"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Check, Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Modal, ModalActions } from "@/components/ui/modal"
import { addToDraft } from "@/lib/machina/draft"
import { eur } from "@/lib/machina/format"
import { OPERATOR_MODE, TRANSPORT_MODE } from "@/lib/machina/labels"
import type { PublicModel, PublicOffer } from "@/lib/machina/types"

export type DraftPreset = {
  qty?: number
  accessoryIds?: string[]
  transport?: boolean
  operator?: boolean
  from?: string
  to?: string
}

/** Choose quantity, accessories, transport and operator, then add the offer to the request draft. */
export function AddToDraftDialog({
  offer,
  model,
  preset = {},
  onClose,
}: {
  offer: PublicOffer
  model: PublicModel
  preset?: DraftPreset
  onClose: () => void
}) {
  const router = useRouter()
  const opMode = offer.operator.mode
  const [qty, setQty] = useState(String(preset.qty ?? 1))
  const [acc, setAcc] = useState<string[]>(
    offer.accessories
      .filter((a) => a.included || preset.accessoryIds?.includes(a.accessoryId))
      .map((a) => a.accessoryId)
  )
  const [transport, setTransport] = useState(
    preset.transport !== false && offer.transport.mode !== "unavailable"
  )
  const [operator, setOperator] = useState(
    opMode === "included" || Boolean(preset.operator && opMode !== "unavailable")
  )

  function submit(e: React.FormEvent) {
    e.preventDefault()
    addToDraft(
      {
        offerId: offer.id,
        modelId: model.id,
        qty: Math.max(1, Math.trunc(Number(qty)) || 1),
        accessoryIds: acc,
        transport,
        operator: operator && opMode !== "included",
      },
      { from: preset.from, to: preset.to }
    )
    toast.success("Added to the request", {
      action: { label: "View request", onClick: () => router.push("/request") },
    })
    onClose()
  }

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title="Add to request"
      description={`${model.brand} ${model.model} · ${offer.partner.name}`}
    >
      <form onSubmit={submit}>
        <Field label="Quantity" htmlFor="add-qty">
          <Input
            id="add-qty"
            type="number"
            min={1}
            max={10}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </Field>
        {offer.accessories.length > 0 && (
          <fieldset className="mb-3.5">
            <legend className="mb-1 text-[0.85rem] font-semibold">Accessories</legend>
            <div className="space-y-1">
              {offer.accessories.map((a) => (
                <Check
                  key={a.accessoryId}
                  checked={acc.includes(a.accessoryId)}
                  onChange={(e) =>
                    setAcc(
                      e.target.checked
                        ? [...acc, a.accessoryId]
                        : acc.filter((x) => x !== a.accessoryId)
                    )
                  }
                  label={
                    <>
                      {a.name}{" "}
                      <span className="text-muted-foreground text-sm">
                        {a.included ? "included" : `${eur(a.day)}/day`}
                      </span>
                    </>
                  }
                />
              ))}
            </div>
          </fieldset>
        )}
        <div className="space-y-2">
          <Check
            checked={transport}
            disabled={offer.transport.mode === "unavailable"}
            onChange={(e) => setTransport(e.target.checked)}
            label={`Delivery to site (${TRANSPORT_MODE[offer.transport.mode]})`}
          />
          <Check
            checked={operator}
            disabled={opMode === "unavailable" || opMode === "included"}
            onChange={(e) => setOperator(e.target.checked)}
            label={`With operator (${OPERATOR_MODE[opMode]})`}
          />
        </div>
        <ModalActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            Add
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}
