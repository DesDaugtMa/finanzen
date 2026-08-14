import { AccountType } from './balance.model';

/** Ein Konto des angemeldeten Nutzers. Spiegelt `BankAccountDto` des Backends. */
export interface BankAccount {
  id: number;
  name: string;
  /** Kontokategorie. Zurzeit legt die App ausschließlich Girokonten an. */
  type: AccountType;
  bankName: string | null;
  iban: string | null;
  color: string | null;
  currency: string;
  initialBalance: number;
  /** Anfangssaldo + Einnahmen − Ausgaben, serverseitig berechnet. */
  currentBalance: number;
  createdAt: string;
}

/**
 * Die Felder, die das Kontoformular vorbelegt. Bewusst als eigener, schmaler Typ:
 * so kann der Dialog sowohl mit einem `BankAccount` als auch mit einem
 * `AccountBalance` der Bilanz-Übersicht befüllt werden, ohne dass eine der beiden
 * Ansichten Daten nachladen muss, die sie längst hat.
 */
export interface EditableBankAccount {
  name: string;
  bankName: string | null;
  iban: string | null;
  color: string | null;
  initialBalance: number;
}

/** Nutzdaten für das Anlegen und Bearbeiten — beide Endpunkte erwarten dieselben Felder. */
export interface BankAccountPayload {
  name: string;
  bankName?: string | null;
  iban?: string | null;
  color?: string | null;
  initialBalance: number;
}
