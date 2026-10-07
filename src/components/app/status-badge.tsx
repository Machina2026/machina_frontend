import { Badge } from "@/components/ui/badge"
import {
  CHANGE_STATUS,
  CHARGE_STATUS,
  COMPANY_STATUS,
  ORDER_STATUS,
  PAYMENT_STATUS,
  QUOTE_SENT_FOR_PARTNER,
  QUOTE_STATUS,
  REQUEST_STATUS,
  USER_STATUS,
} from "@/lib/machina/labels"
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

const TABLES = {
  quote: QUOTE_STATUS,
  order: ORDER_STATUS,
  payment: PAYMENT_STATUS,
  change: CHANGE_STATUS,
  charge: CHARGE_STATUS,
  request: REQUEST_STATUS,
  company: COMPANY_STATUS,
  user: USER_STATUS,
}

export function StatusBadge(props: Props) {
  const entry = (
    TABLES[props.kind] as Record<
      string,
      { label: string; tone: Parameters<typeof Badge>[0]["tone"] }
    >
  )[props.status]
  const label =
    props.kind === "quote" && props.forPartner && props.status === "sent"
      ? QUOTE_SENT_FOR_PARTNER
      : entry.label
  return <Badge tone={entry.tone}>{label}</Badge>
}
