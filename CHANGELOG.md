# v1.2 — 11.09.2026

Konten lassen sich nun frei sortieren, der störende Scrollbalken in der Buchungen-Übersicht wurde entfernt, die Fixkosten-Liste kompakter gestaltet und die Buchungsliste eines Girokontos beschleunigt.

**Features:**
- Konten können innerhalb ihrer Kontoart per Ziehen und Ablegen in eine eigene Reihenfolge gebracht werden, die überall in der App erhalten bleibt.

**Changes:**
- Die Fixkosten-Positionen werden kompakter dargestellt und stehen auf breiteren Bildschirmen zu zweit nebeneinander statt nur untereinander.
- Suche, Filter und Sortierung der Buchungsliste eines Girokontos wirken jetzt sofort, ohne Wartezeit.
- Die Seitenblätterei unterhalb der Buchungsliste entfällt, da alle Buchungen des Monats auf einmal angezeigt werden.
- Die Schuldner-Übersicht zeigt die einzelnen Personen ab Tablet-Breite nebeneinander in einem Raster statt einzeln untereinander und nutzt auf sehr breiten Bildschirmen mehr Platz.

**Bugfixes:**
- Der stets sichtbare, kaum aussagekräftige Scrollbalken neben der Buchungsliste wird nicht mehr angezeigt.

# v1.1 — 16.08.2026

Diese Version bringt eine neu aufgebaute Startseite, eine überarbeitete Übersicht von Girokonten, eine überarbeitete Navigation und Schuldnerliste und behebt die fehlerhafte Darstellung der Monatsauswahl.

**Features:**
- In der Übersicht eines Girokontos wird ausgewiesen, wie viel pro verbleibendem Tag des Monats noch ausgegeben werden kann.
- Die Übersicht eines Girokontos zeigt den Verlauf des Monats als Linie mit einem Wert für jeden Tag.
- Ein Tag im Verlauf kann angetippt werden, um Datum und Stand dieses Tages zu lesen.
- Die Gewichtung der Ausgaben wird als Ringdiagramm nach Kategorien dargestellt, mit Prozentwert und Betrag.
- Die geplanten Beträge einer Kategorie werden den tatsächlichen Ausgaben als Säulenpaar gegenübergestellt.
- Die Übersicht eines Girokontos zeigt eine Hochrechnung, mit welchem Ergebnis der Monat voraussichtlich endet.
- Die Startseite ist in die Bereiche „Konten" und „Statistiken" geteilt, zwischen denen gewechselt werden kann.
- Der Zeitraum der Startseite kann wahlweise auf einen Monat oder auf ein ganzes Jahr gestellt werden.
- Zu einem Schuldeintrag können Beträge von Hand erfasst werden, auch wenn es dazu keine Buchung gibt.
- Ein von Hand erfasster Betrag kann wahlweise als verliehen oder als zurückgezahlt eingetragen werden.
- Von Hand erfasste Beträge können nachträglich geändert und wieder entfernt werden.
- Beim Anlegen eines Schuldeintrags kann der geliehene Betrag gleich mit angegeben werden.
- In der Navigation zeigt eine rote Zahl beim Punkt „Schuldner", wie viele Einträge noch offen sind.

**Changes:**
- Die Übersicht eines Girokontos wurde neu aufgebaut und stellt die Auswertungen des Monats in den Vordergrund.
- Die Kennzahlen der Übersicht nehmen weniger Platz ein und stehen auf Handys zu zweit nebeneinander.
- Bilanz, Kontostand, Einnahmen und Ausgaben werden in der Übersicht nicht mehr wiederholt, da sie bereits im Kopf der Seite stehen.
- Die Liste der Ausgaben nach Kategorie wurde durch das Ringdiagramm ersetzt.
- Bei mehr als sechs Kategorien werden die kleinsten zusammengefasst und lassen sich bei Bedarf einzeln anzeigen.
- Sparkonten, Depots und Wallets behalten die bisherige Übersicht.
- Die Startseite wurde neu gestaltet und gliedert die Konten nach ihrer Kontoart.
- Zu jeder Kontoart werden Bilanz, Einnahmen, Ausgaben und Vermögen gesondert ausgewiesen.
- Auf größeren Bildschirmen stehen mehrere Konten nebeneinander.
- Die Gesamtbilanz und der Jahresverlauf werden auf der Startseite vorerst nicht mehr angezeigt.
- Auf größeren Bildschirmen steht die Navigation nun als Leiste am linken Rand, auf kleinen Bildschirmen bleibt sie am unteren Rand.
- Das Menü oben rechts wurde entfernt.
- Erscheinungsbild, aktive Sitzungen, die Versionsanzeige und das Abmelden sind nun auf der Profilseite zu finden.
- Vor dem Abmelden wird nun eine Bestätigung eingeholt.
- Zugeordnete Buchungen und von Hand erfasste Beträge stehen bei einem Schuldeintrag gemeinsam in einer Liste, geordnet nach Datum.
- Die Zahl in der Navigation wird sofort aktualisiert, sobald sich an den Schulden etwas ändert.

**Bugfixes:**
- Ein Bug, der den Kalender zur Monatsauswahl abgeschnitten hat, wurde behoben.
- Der Kalender zur Monatsauswahl bleibt nun auch auf kleinen Bildschirmen vollständig sichtbar.
- Beim Wechseln zwischen den Bereichen eines Girokontos springt die Seite nicht mehr an den Anfang.
- Das frei verfügbare Geld eines Girokontos wird nun anhand des aktuellen Kontostands berechnet, statt anhand der Bilanz des Monats.

# v1.0 — 14.08.2026

Der erste Funktionsumfang der Anwendung: Konten, Buchungen, Kategorien, Budgets, Fixkosten und Auswertungen.

**Features:**
- Girokonten wurden hinzugefügt und können nun mit ihrem aktuellen Kontostand angelegt werden.
- Einnahmen und Ausgaben können erfasst und eigenen Kategorien zugeordnet werden.
- Kategorien können mit einer eigenen Farbe und einem Symbol versehen werden.
- Ausgaben können als „noch nicht abgebucht" markiert und später einzeln abgehakt werden.
- Alle offenen Buchungen eines Monats können gemeinsam auf einmal abgehakt werden.
- Zu jedem Konto wird zusätzlich der Stand „laut Bank" ohne die noch nicht abgebuchten Beträge ausgewiesen.
- Budgets können je Kategorie und Monat festgelegt werden und zeigen den verbleibenden Betrag an.
- Monatliche Fixkosten können geplant, mit der passenden Buchung abgehakt und in den Folgemonat übernommen werden.
- Zwei zusammengehörige Buchungen können miteinander verknüpft werden und zählen dann nicht mehr als Einnahme oder Ausgabe.
- Zu einer verknüpften Buchung können die Angaben der Gegenbuchung eingesehen und diese direkt auf dem anderen Konto geöffnet werden.
- Die Monatsübersicht zeigt den Verlauf von Einnahmen, Ausgaben und Ergebnis über den Monat.
- Verliehenes Geld kann als Liste geführt werden und weist den noch offenen Betrag aus.
- Die Anmeldung ist per E-Mail und Passwort sowie über ein Google-Konto möglich.
- Neue Mitglieder werden ausschließlich per Einladung aufgenommen.
- Das Passwort kann jederzeit zurückgesetzt werden.
- Die aktuell angemeldeten Geräte werden aufgelistet und können eingesehen werden.
- Ein helles und ein dunkles Erscheinungsbild stehen zur Wahl, wahlweise gesteuert durch das Gerät.
- Die Anwendung kann als App auf dem Smartphone installiert werden.
- Ohne Internetverbindung wird der zuletzt geladene Stand weiterhin angezeigt.
- Der Changelog wurde hinzugefügt und zeigt zu jeder Version die Änderungen an.
