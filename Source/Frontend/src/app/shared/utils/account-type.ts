import { AccountType } from '../../core/models/balance.model';

/** Wie eine Kontokategorie in der Oberfläche auftritt. */
interface AccountTypeInfo {
  /** Beschriftung für eine Gruppe mehrerer Konten. */
  plural: string;
  /** Beschriftung für ein einzelnes Konto, z. B. als Untertitel einer Karte. */
  singular: string;
  /** Bootstrap-Icon ohne das Präfix `bi-`. */
  icon: string;
}

/**
 * Die Kategorien in der Reihenfolge, in der das Backend sie liefert und die
 * Übersicht sie zeigt: erst das Geld, an das man täglich kommt, dann das Angelegte.
 */
const ACCOUNT_TYPES: Readonly<Record<AccountType, AccountTypeInfo>> = {
  CheckingAccount: { plural: 'Girokonten', singular: 'Girokonto', icon: 'bank2' },
  SavingsAccount: { plural: 'Sparkonten', singular: 'Sparkonto', icon: 'piggy-bank' },
  Depot: { plural: 'Aktiendepots', singular: 'Aktiendepot', icon: 'graph-up-arrow' },
  CryptoWallet: { plural: 'Crypto-Wallets', singular: 'Crypto-Wallet', icon: 'currency-bitcoin' },
};

const FALLBACK: AccountTypeInfo = { plural: 'Konten', singular: 'Konto', icon: 'wallet2' };

/**
 * Alle Angaben zu einer Kategorie. Unbekannte Werte fallen auf neutrale
 * Bezeichnungen zurück, damit eine später ergänzte Kategorie die Übersicht
 * nicht mit einer leeren Beschriftung stehen lässt.
 */
export function accountTypeInfo(type: AccountType): AccountTypeInfo {
  return ACCOUNT_TYPES[type] ?? FALLBACK;
}

export function accountTypeLabel(type: AccountType): string {
  return accountTypeInfo(type).plural;
}

export function accountTypeSingular(type: AccountType): string {
  return accountTypeInfo(type).singular;
}

export function accountTypeIcon(type: AccountType): string {
  return accountTypeInfo(type).icon;
}
