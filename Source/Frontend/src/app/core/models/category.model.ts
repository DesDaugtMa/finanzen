/** Eine Kategorie eines Kontos. Gilt monatsübergreifend. Spiegelt `CategoryDto` des Backends. */
export interface Category {
  id: number;
  accountId: number;
  name: string;
  color: string | null;
  /** Bootstrap-Icon-Name ohne Präfix, z. B. `cart`. */
  icon: string | null;
  /** Anzahl aller Buchungen dieser Kategorie über alle Monate — Grundlage für die Löschwarnung. */
  transactionCount: number;
  createdAt: string;
}

/** Nutzdaten zum Anlegen und Bearbeiten einer Kategorie. */
export interface CategoryPayload {
  name: string;
  color: string | null;
  icon: string | null;
}
