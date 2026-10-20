"use client"

import { Badge } from "@/components/ui/badge"
import { useLabels } from "@/lib/machina/labels"
import type {
  ChangeStatus,
  ChargeStatus,
  CompanyStatus,
  OrderStatus,
  PaymentStatus,
  QuoteStatus,
  RequestStatus,
  UserStatus,
} from "@/lib/machina/types"

type Props =
  | { kind: "quote"; status: QuoteStatus; forPartner?: boolean }
  | { kind: "order"; status: OrderStatus }
  | { kind: "payment"; status: PaymentStatus }
  | { kind: "change"; status: ChangeStatus }
  | { kind: "charge"; status: ChargeStatus }
  | { kind: "request"; status: RequestStatus }
  | { kind: "company"; status: CompanyStatus }
  | { kind: "user"; status: UserStatus }

export function StatusBadge(props: Props) {
  const L = useLabels()
  const tables = {
    quote: L.QUOTE_STATUS,
    order: L.ORDER_STATUS,
    payment: L.PAYMENT_STATUS,
    change: L.CHANGE_STATUS,
    charge: L.CHARGE_STATUS,
    request: L.REQUEST_STATUS,
    company: L.COMPANY_STATUS,
    user: L.USER_STATUS,
  }
  const entry = (
    tables[props.kind] as Record<
      string,
      { label: string; tone: Parameters<typeof Badge>[0]["tone"] }
    >
  )[props.status]
  const label =
    props.kind === "quote" && props.forPartner && props.status === "sent"
      ? L.QUOTE_SENT_FOR_PARTNER
      : entry.label
  return <Badge tone={entry.tone}>{label}</Badge>
}
