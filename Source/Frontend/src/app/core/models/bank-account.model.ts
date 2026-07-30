/** Ein Girokonto des angemeldeten Nutzers. Spiegelt `BankAccountDto` des Backends. */
export interface BankAccount {
  id: number;
  name: string;
  bankName: string | null;
  iban: string | null;
  color: string | null;
  currency: string;
  initialBalance: number;
  /** Anfangssaldo + Einnahmen − Ausgaben, serverseitig berechnet. */
  currentBalance: number;
  createdAt: string;
}

/** Nutzdaten für das Anlegen und Bearbeiten — beide Endpunkte erwarten dieselben Felder. */
export interface BankAccountPayload {
  name: string;
  bankName?: string | null;
  iban?: string | null;
  color?: string | null;
  initialBalance: number;
}
