import type { BadgeTone } from "@/components/ui/badge"
import { useMessages } from "@/i18n/client"
import { defineMessages } from "@/i18n/messages"

import type {
  ChangeKind,
  ChangeStatus,
  ChargeKind,
  ChargeStatus,
  CompanyRole,
  CompanyStatus,
  CompanyType,
  DocType,
  LineType,
  OperatorMode,
  OrderStatus,
  PaymentStatus,
  QuoteStatus,
  RequestStatus,
  SessionRole,
  TransportMode,
  UserStatus,
} from "./types"

// UI labels for every status and kind, in each language, with their badge tones.
// Use them with `const L = useLabels()`, then `L.QUOTE_STATUS[status].label`.

type Labeled = { label: string; tone: BadgeTone }

const TONES = {
  QUOTE_STATUS: {
    awaiting_partner: "warn",
    sent: "accent",
    accepted: "ok",
    declined_by_partner: "bad",
    rejected_by_client: "bad",
    expired: "bad",
    withdrawn: "neutral",
  } satisfies Record<QuoteStatus, BadgeTone>,
  ORDER_STATUS: {
    confirmed: "info",
    in_progress: "ok",
    completed: "neutral",
    cancelled: "bad",
  } satisfies Record<OrderStatus, BadgeTone>,
  PAYMENT_STATUS: {
    unpaid: "warn",
    declared: "info",
    received: "ok",
  } satisfies Record<PaymentStatus, BadgeTone>,
  CHANGE_STATUS: {
    requested_by_client: "warn",
    pending_approval: "accent",
    accepted: "ok",
    rejected: "bad",
    declined_by_partner: "bad",
  } satisfies Record<ChangeStatus, BadgeTone>,
  CHARGE_STATUS: {
    pending_review: "warn",
    accepted: "ok",
    disputed: "bad",
    withdrawn: "neutral",
  } satisfies Record<ChargeStatus, BadgeTone>,
  REQUEST_STATUS: {
    confirmed: "ok",
    partial: "warn",
    partially_closed: "warn",
    in_progress: "info",
    closed: "neutral",
  } satisfies Record<RequestStatus, BadgeTone>,
  COMPANY_STATUS: {
    pending: "warn",
    approved: "ok",
    rejected: "bad",
    suspended: "bad",
  } satisfies Record<CompanyStatus, BadgeTone>,
  USER_STATUS: {
    active: "ok",
    suspended: "bad",
    removed: "neutral",
  } satisfies Record<UserStatus, BadgeTone>,
}

type Texts = {
  QUOTE_STATUS: Record<QuoteStatus, string>
  /** How a "sent" quote reads from the supplier's side. */
  QUOTE_SENT_FOR_PARTNER: string
  ORDER_STATUS: Record<OrderStatus, string>
  PAYMENT_STATUS: Record<PaymentStatus, string>
  CHANGE_STATUS: Record<ChangeStatus, string>
  CHARGE_STATUS: Record<ChargeStatus, string>
  REQUEST_STATUS: Record<RequestStatus, string>
  COMPANY_STATUS: Record<CompanyStatus, string>
  USER_STATUS: Record<UserStatus, string>
  LINE_TYPE: Record<LineType, string>
  CHANGE_KIND: Record<ChangeKind, string>
  CHARGE_KIND: Record<ChargeKind, string>
  TRANSPORT_MODE: Record<TransportMode, string>
  OPERATOR_MODE: Record<OperatorMode, string>
  DOC_TYPE: Record<DocType, string>
  /** Labels for "to do" items on the dashboards. */
  ACTION_KIND: Record<string, string>
  COMPANY_TYPE: Record<CompanyType, string>
  ROLE: Record<SessionRole, string>
  COMPANY_ROLE: Record<CompanyRole, string>
  /** Audit log actions, as a phrase that reads before the target ("Approved Noleggi Dora"). */
  AUDIT_ACTION: Record<string, string>
}

const TEXTS = defineMessages<Texts>({
  en: {
    QUOTE_STATUS: {
      awaiting_partner: "Awaiting partner",
      sent: "To accept",
      accepted: "Accepted",
      declined_by_partner: "Declined by partner",
      rejected_by_client: "Rejected by customer",
      expired: "Expired",
      withdrawn: "Cancelled",
    },
    QUOTE_SENT_FOR_PARTNER: "Sent to customer",
    ORDER_STATUS: {
      confirmed: "Confirmed",
      in_progress: "In progress",
      completed: "Completed",
      cancelled: "Cancelled",
    },
    PAYMENT_STATUS: {
      unpaid: "Unpaid",
      declared: "Payment declared by customer",
      received: "Receipt confirmed by partner",
    },
    CHANGE_STATUS: {
      requested_by_client: "Awaiting partner's price",
      pending_approval: "To approve",
      accepted: "Accepted",
      rejected: "Rejected by customer",
      declined_by_partner: "Not accepted by partner",
    },
    CHARGE_STATUS: {
      pending_review: "To review",
      accepted: "Accepted",
      disputed: "Disputed",
      withdrawn: "Withdrawn",
    },
    REQUEST_STATUS: {
      confirmed: "Confirmed",
      partial: "Not confirmed",
      partially_closed: "Partly confirmed",
      in_progress: "In progress",
      closed: "Closed",
    },
    COMPANY_STATUS: {
      pending: "Awaiting approval",
      approved: "Approved",
      rejected: "Rejected",
      suspended: "Suspended",
    },
    USER_STATUS: { active: "Active", suspended: "Suspended", removed: "Removed" },
    LINE_TYPE: {
      equipment: "Machine",
      accessory: "Accessory",
      operator: "Operator",
      transport: "Transport",
      service: "Service",
    },
    CHANGE_KIND: {
      extension: "Extension",
      accessory: "Accessory added",
      service: "Service added",
    },
    CHARGE_KIND: { damage: "Damage", fuel: "Fuel", cleaning: "Extra cleaning", other: "Other" },
    TRANSPORT_MODE: { fixed: "Fixed rate", on_quote: "On quote", unavailable: "Not available" },
    OPERATOR_MODE: {
      available: "Available",
      on_quote: "On request (on quote)",
      unavailable: "Not available",
      included: "Included (wet hire)",
    },
    DOC_TYPE: {
      invoice: "Invoice",
      supplementary_invoice: "Supplementary invoice",
      credit_note: "Credit note",
    },
    ACTION_KIND: {
      quote: "Quote",
      change: "Change",
      charge: "Charge",
      request: "Request",
      payment: "Payment",
      tax: "Tax document",
    },
    COMPANY_TYPE: { client: "Customer", partner: "Rental company" },
    ROLE: { client: "Customer", partner: "Rental company", admin: "Machina admin" },
    COMPANY_ROLE: { owner: "Owner", member: "Member" },
    AUDIT_ACTION: {
      "company.registered": "Registered",
      "company.approve": "Approved",
      "company.reject": "Rejected",
      "company.suspend": "Suspended",
      "company.reactivate": "Reactivated",
      "company.credit_check": "Ran a credit check on",
      "user.suspended": "Suspended user",
      "user.reactivated": "Reactivated user",
      "user.removed": "Removed from team",
      "user.company_role_changed": "Changed team role of",
      "user.password_changed": "Changed password of",
      "user.admin_created_cli": "Created admin",
      "invitation.created": "Invited",
      "invitation.revoked": "Revoked invitation for",
      "invitation.accepted": "Accepted invitation for",
      "offer.created": "Added machine",
      "offer.updated": "Updated machine",
      "offer.prices_updated": "Updated prices of",
      "offer.photo_added": "Added a photo to",
      "offer.photo_removed": "Removed a photo from",
    },
  },
  it: {
    QUOTE_STATUS: {
      awaiting_partner: "In attesa del noleggiatore",
      sent: "Da accettare",
      accepted: "Accettato",
      declined_by_partner: "Rifiutato dal noleggiatore",
      rejected_by_client: "Rifiutato dal cliente",
      expired: "Scaduto",
      withdrawn: "Annullato",
    },
    QUOTE_SENT_FOR_PARTNER: "Inviato al cliente",
    ORDER_STATUS: {
      confirmed: "Confermato",
      in_progress: "In corso",
      completed: "Completato",
      cancelled: "Annullato",
    },
    PAYMENT_STATUS: {
      unpaid: "Da pagare",
      declared: "Pagamento dichiarato dal cliente",
      received: "Incasso confermato dal noleggiatore",
    },
    CHANGE_STATUS: {
      requested_by_client: "In attesa del prezzo del noleggiatore",
      pending_approval: "Da approvare",
      accepted: "Accettata",
      rejected: "Rifiutata dal cliente",
      declined_by_partner: "Non accettata dal noleggiatore",
    },
    CHARGE_STATUS: {
      pending_review: "Da verificare",
      accepted: "Accettato",
      disputed: "Contestato",
      withdrawn: "Ritirato",
    },
    REQUEST_STATUS: {
      confirmed: "Confermata",
      partial: "Non confermata",
      partially_closed: "Confermata in parte",
      in_progress: "In corso",
      closed: "Chiusa",
    },
    COMPANY_STATUS: {
      pending: "In attesa di approvazione",
      approved: "Approvata",
      rejected: "Rifiutata",
      suspended: "Sospesa",
    },
    USER_STATUS: { active: "Attivo", suspended: "Sospeso", removed: "Rimosso" },
    LINE_TYPE: {
      equipment: "Macchina",
      accessory: "Accessorio",
      operator: "Operatore",
      transport: "Trasporto",
      service: "Servizio",
    },
    CHANGE_KIND: {
      extension: "Proroga",
      accessory: "Accessorio aggiunto",
      service: "Servizio aggiunto",
    },
    CHARGE_KIND: {
      damage: "Danni",
      fuel: "Carburante",
      cleaning: "Pulizia straordinaria",
      other: "Altro",
    },
    TRANSPORT_MODE: {
      fixed: "Tariffa fissa",
      on_quote: "Su preventivo",
      unavailable: "Non disponibile",
    },
    OPERATOR_MODE: {
      available: "Disponibile",
      on_quote: "Su richiesta (su preventivo)",
      unavailable: "Non disponibile",
      included: "Incluso (noleggio a caldo)",
    },
    DOC_TYPE: {
      invoice: "Fattura",
      supplementary_invoice: "Fattura integrativa",
      credit_note: "Nota di credito",
    },
    ACTION_KIND: {
      quote: "Preventivo",
      change: "Modifica",
      charge: "Addebito",
      request: "Richiesta",
      payment: "Pagamento",
      tax: "Documento fiscale",
    },
    COMPANY_TYPE: { client: "Cliente", partner: "Noleggiatore" },
    ROLE: { client: "Cliente", partner: "Noleggiatore", admin: "Amministratore Machina" },
    COMPANY_ROLE: { owner: "Titolare", member: "Membro" },
    AUDIT_ACTION: {
      "company.registered": "Ha registrato",
      "company.approve": "Ha approvato",
      "company.reject": "Ha rifiutato",
      "company.suspend": "Ha sospeso",
      "company.reactivate": "Ha riattivato",
      "company.credit_check": "Ha verificato l'affidabilità di",
      "user.suspended": "Ha sospeso l'utente",
      "user.reactivated": "Ha riattivato l'utente",
      "user.removed": "Ha rimosso dal team",
      "user.company_role_changed": "Ha cambiato il ruolo nel team di",
      "user.password_changed": "Ha cambiato la password di",
      "user.admin_created_cli": "Ha creato l'amministratore",
      "invitation.created": "Ha invitato",
      "invitation.revoked": "Ha revocato l'invito per",
      "invitation.accepted": "Ha accettato l'invito per",
      "offer.created": "Ha aggiunto la macchina",
      "offer.updated": "Ha aggiornato la macchina",
      "offer.prices_updated": "Ha aggiornato i prezzi di",
      "offer.photo_added": "Ha aggiunto una foto a",
      "offer.photo_removed": "Ha rimosso una foto da",
    },
  },
})

const withTones = <K extends string>(labels: Record<K, string>, tones: Record<K, BadgeTone>) =>
  Object.fromEntries(
    Object.entries<string>(labels).map(([k, label]) => [k, { label, tone: tones[k as K] }])
  ) as Record<K, Labeled>

function build(t: Texts) {
  return {
    ...t,
    QUOTE_STATUS: withTones(t.QUOTE_STATUS, TONES.QUOTE_STATUS),
    ORDER_STATUS: withTones(t.ORDER_STATUS, TONES.ORDER_STATUS),
    PAYMENT_STATUS: withTones(t.PAYMENT_STATUS, TONES.PAYMENT_STATUS),
    CHANGE_STATUS: withTones(t.CHANGE_STATUS, TONES.CHANGE_STATUS),
    CHARGE_STATUS: withTones(t.CHARGE_STATUS, TONES.CHARGE_STATUS),
    REQUEST_STATUS: withTones(t.REQUEST_STATUS, TONES.REQUEST_STATUS),
    COMPANY_STATUS: withTones(t.COMPANY_STATUS, TONES.COMPANY_STATUS),
    USER_STATUS: withTones(t.USER_STATUS, TONES.USER_STATUS),
  }
}

const BUILT = { en: build(TEXTS.en), it: build(TEXTS.it) }

export type Labels = ReturnType<typeof build>

/** Status and kind labels in the current language. */
export function useLabels(): Labels {
  return useMessages(BUILT)
}
