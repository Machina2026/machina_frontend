"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Check, Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Modal, ModalActions } from "@/components/ui/modal"
import { addToDraft } from "@/lib/machina/draft"
import { useFormat, useMessages } from "@/i18n/client"
import { useCommon } from "@/i18n/common"
import { defineMessages } from "@/i18n/messages"
import { useLabels } from "@/lib/machina/labels"
import type { PublicModel, PublicOffer } from "@/lib/machina/types"

export type DraftPreset = {
  qty?: number
  accessoryIds?: string[]
  transport?: boolean
  operator?: boolean
  from?: string
  to?: string
}

const M = defineMessages({
  en: {
    added: "Added to the request",
    viewRequest: "View request",
    title: "Add to request",
    quantity: "Quantity",
    accessories: "Accessories",
    included: "included",
    perDay: "/day",
    delivery: (mode: string) => `Delivery to site (${mode})`,
    withOperator: (mode: string) => `With operator (${mode})`,
    add: "Add",
  },
  it: {
    added: "Aggiunto alla richiesta",
    viewRequest: "Vedi la richiesta",
    title: "Aggiungi alla richiesta",
    quantity: "Quantità",
    accessories: "Accessori",
    included: "incluso",
    perDay: "/giorno",
    delivery: (mode: string) => `Consegna in cantiere (${mode})`,
    withOperator: (mode: string) => `Con operatore (${mode})`,
    add: "Aggiungi",
  },
})

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
  const t = useMessages(M)
  const c = useCommon()
  const L = useLabels()
  const { eur } = useFormat()
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
    toast.success(t.added, {
      action: { label: t.viewRequest, onClick: () => router.push("/request") },
    })
    onClose()
  }

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title={t.title}
      description={`${model.brand} ${model.model} · ${offer.partner.name}`}
    >
      <form onSubmit={submit}>
        <Field label={t.quantity} htmlFor="add-qty">
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
            <legend className="mb-1 text-[0.85rem] font-semibold">{t.accessories}</legend>
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
                        {a.included ? t.included : `${eur(a.day)}${t.perDay}`}
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
            label={t.delivery(L.TRANSPORT_MODE[offer.transport.mode])}
          />
          <Check
            checked={operator}
            disabled={opMode === "unavailable" || opMode === "included"}
            onChange={(e) => setOperator(e.target.checked)}
            label={t.withOperator(L.OPERATOR_MODE[opMode])}
          />
        </div>
        <ModalActions>
          <Button onClick={onClose}>{c.cancel}</Button>
          <Button type="submit" variant="primary">
            {t.add}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}
