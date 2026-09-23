import type { BadgeTone } from "@/components/ui/badge"

import type {
  ChangeKind,
  ChangeStatus,
  ChargeKind,
  ChargeStatus,
  DocType,
  LineType,
  OperatorMode,
  OrderStatus,
  PaymentStatus,
  QuoteStatus,
  RequestStatus,
  TransportMode,
} from "./types"

// UI labels and badge tones for every status. Add a language by mapping the same keys.

type Labeled = { label: string; tone: BadgeTone }

export const QUOTE_STATUS: Record<QuoteStatus, Labeled> = {
  awaiting_partner: { label: "Awaiting partner", tone: "warn" },
  sent: { label: "To accept", tone: "accent" },
  accepted: { label: "Accepted", tone: "ok" },
  declined_by_partner: { label: "Declined by partner", tone: "bad" },
  rejected_by_client: { label: "Rejected by customer", tone: "bad" },
  expired: { label: "Expired", tone: "bad" },
  withdrawn: { label: "Cancelled", tone: "neutral" },
}
/** How a "sent" quote reads from the supplier's side. */
export const QUOTE_SENT_FOR_PARTNER = "Sent to customer"

export const ORDER_STATUS: Record<OrderStatus, Labeled> = {
  confirmed: { label: "Confirmed", tone: "info" },
  in_progress: { label: "In progress", tone: "ok" },
  completed: { label: "Completed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "bad" },
}

export const PAYMENT_STATUS: Record<PaymentStatus, Labeled> = {
  unpaid: { label: "Unpaid", tone: "warn" },
  declared: { label: "Payment declared by customer", tone: "info" },
  received: { label: "Receipt confirmed by partner", tone: "ok" },
}

export const CHANGE_STATUS: Record<ChangeStatus, Labeled> = {
  requested_by_client: { label: "Awaiting partner's price", tone: "warn" },
  pending_approval: { label: "To approve", tone: "accent" },
  accepted: { label: "Accepted", tone: "ok" },
  rejected: { label: "Rejected by customer", tone: "bad" },
  declined_by_partner: { label: "Not accepted by partner", tone: "bad" },
}

export const CHARGE_STATUS: Record<ChargeStatus, Labeled> = {
  pending_review: { label: "To review", tone: "warn" },
  accepted: { label: "Accepted", tone: "ok" },
  disputed: { label: "Disputed", tone: "bad" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
}

export const REQUEST_STATUS: Record<RequestStatus, Labeled> = {
  confirmed: { label: "Confirmed", tone: "ok" },
  partial: { label: "Not confirmed", tone: "warn" },
  partially_closed: { label: "Partly confirmed", tone: "warn" },
  in_progress: { label: "In progress", tone: "info" },
  closed: { label: "Closed", tone: "neutral" },
}

export const LINE_TYPE: Record<LineType, string> = {
  equipment: "Machine",
  accessory: "Accessory",
  operator: "Operator",
  transport: "Transport",
  service: "Service",
}

export const CHANGE_KIND: Record<ChangeKind, string> = {
  extension: "Extension",
  accessory: "Accessory added",
  service: "Service added",
}

export const CHARGE_KIND: Record<ChargeKind, string> = {
  damage: "Damage",
  fuel: "Fuel",
  cleaning: "Extra cleaning",
  other: "Other",
}

export const TRANSPORT_MODE: Record<TransportMode, string> = {
  fixed: "Fixed rate",
  on_quote: "On quote",
  unavailable: "Not available",
}

export const OPERATOR_MODE: Record<OperatorMode, string> = {
  available: "Available",
  on_quote: "On request (on quote)",
  unavailable: "Not available",
  included: "Included (wet hire)",
}

export const DOC_TYPE: Record<DocType, string> = {
  invoice: "Invoice",
  supplementary_invoice: "Supplementary invoice",
  credit_note: "Credit note",
}

/** Labels for "to do" items on the dashboards. */
export const ACTION_KIND: Record<string, string> = {
  quote: "Quote",
  change: "Change",
  charge: "Charge",
  request: "Request",
  payment: "Payment",
  tax: "Tax document",
}
