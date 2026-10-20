import { useMessages } from "./client"
import { defineMessages } from "./messages"

/** Words many screens share. Screen-specific texts live next to their component. */
export const COMMON = defineMessages({
  en: {
    cancel: "Cancel",
    confirm: "Confirm",
    close: "Close",
    save: "Save",
    saving: "Saving…",
    search: "Search",
    reset: "Reset",
    back: "Back",
    edit: "Edit",
    remove: "Remove",
    loading: "Loading",
    tryAgain: "Try again",
    errorTitle: "Something went wrong",
    errorBody: "Please try again. If the problem continues, contact support.",
    perDay: "/day",
    from: "from",
    pricesExclVat: "Prices excluding VAT. Availability is always confirmed by the rental company.",
    illustrativePhoto: "Illustrative photo",
  },
  it: {
    cancel: "Annulla",
    confirm: "Conferma",
    close: "Chiudi",
    save: "Salva",
    saving: "Salvataggio…",
    search: "Cerca",
    reset: "Azzera",
    back: "Indietro",
    edit: "Modifica",
    remove: "Rimuovi",
    loading: "Caricamento",
    tryAgain: "Riprova",
    errorTitle: "Qualcosa è andato storto",
    errorBody: "Riprova. Se il problema continua, contatta l'assistenza.",
    perDay: "/giorno",
    from: "da",
    pricesExclVat: "Prezzi IVA esclusa. La disponibilità è sempre confermata dal noleggiatore.",
    illustrativePhoto: "Foto illustrativa",
  },
})

export function useCommon() {
  return useMessages(COMMON)
}
