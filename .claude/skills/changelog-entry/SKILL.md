---
name: changelog-entry
description: >-
  Schreibt einen neuen Changelog-Eintrag für die Finanz-App und fügt ihn oben in
  die Datei ./CHANGELOG.md (Repository-Wurzel) ein. Nutze diesen Skill, wenn der
  Nutzer eine neue Version veröffentlichen, den Changelog aktualisieren, „einen
  Changelog-Eintrag schreiben", „release notes erstellen" oder Änderungen für
  Benutzer dokumentieren will — und verpflichtend als letzten Schritt jeder
  Feature-, Change- oder Bugfix-Arbeit an dieser Anwendung. Der Changelog richtet
  sich AUSSCHLIESSLICH an normale Endnutzer — niemals technisch schreiben, keine
  Klassennamen, Endpunkte, Dateien, Frameworks oder Implementierungsdetails. Es
  zählt nur, was der Nutzer in der App sieht oder anders erlebt.
---

# Changelog-Eintrag schreiben

Du schreibst Release Notes für die **Finanz-App**. Sie wird von einem kleinen,
privaten Kreis genutzt — dem Betreiber und seinen Freunden. Die Leser sind
**normale Benutzer**, keine Entwickler, und sie kennen die App bereits. Sie
wollen genau eine Sache wissen: *Was ist neu, was ist anders, was funktioniert
jetzt wieder?*

Die Datei liegt in der Repository-Wurzel unter **`./CHANGELOG.md`**. Neue
Einträge kommen **immer ganz nach oben** (neueste Version zuerst). Das Backend
liest die Datei, zerlegt sie in Versionen und liefert sie an die Changelog-Seite
der App; die Navigation zeigt die oberste Versionsnummer als Link
„vX.Y — Changelog" an. **Das Format unten ist deshalb verbindlich** — was nicht
dazu passt, wird beim Einlesen übersprungen und erscheint nicht in der App.

## Die Tonart

Der Changelog ist ein **sachliches Protokoll**, keine Produktankündigung. Er
liest sich nüchtern, neutral und knapp.

**So klingt es richtig:**

- „Depots wurden hinzugefügt und können nun angelegt werden."
- „Das Erscheinungsbild von Geldkonten wurde angepasst."
- „Ein Bug, der das Erstellen neuer Geldkonten verhinderte, wurde behoben."

Daraus folgt:

- **Neutrale Formulierung, keine Du-Ansprache.** Schreibe „Budgets können nun
  je Kategorie festgelegt werden", nicht „Du kannst jetzt Budgets festlegen".
- **Genau ein Satz pro Punkt.** Kein Nebensatz-Stapel, keine Aufzählung von
  Details innerhalb eines Punktes. Wenn zwei Dinge gemeint sind, sind es zwei
  Punkte.
- **Kein Marketing, kein Pathos, keine Superlative.** Verboten sind Sätze wie
  „Die erste Version von Finanzen ist da", „Ein großer Schritt nach vorne",
  „deutlich besser als zuvor", „ab jetzt behältst du alles im Blick". Die App
  wird nicht beworben — sie wird dokumentiert.
- **Keine Ausrufezeichen, keine Emojis.**
- Der Punkt beschreibt **den Zustand nach der Änderung**, nicht die Arbeit
  daran. Nicht „Wir haben den Kalender überarbeitet", sondern „Der Kalender zur
  Monatsauswahl wird nicht mehr abgeschnitten."

## Die goldene Regel: nicht technisch

- **Niemals** Klassen-, Datei-, Methoden-, Tabellen-, Endpunkt- oder
  Framework-Namen nennen. Keine Begriffe wie „Service", „Controller", „Migration",
  „Refactoring", „Interface", „DTO", „Cache", „Query", „Endpoint".
- **Keine internen Umbauten** erwähnen, die der Nutzer nicht bemerkt. Wenn sich
  an der Bedienung nichts ändert, gehört es nicht in den Changelog.
- Beschreibe **den sichtbaren Nutzen**, nicht die Umsetzung. Statt „Neuer
  Endpunkt für Monatsauswertungen" → „Die Ausgaben je Kategorie werden nun pro
  Monat ausgewiesen."

Faustregel: Wenn ein Freund ohne IT-Wissen den Punkt nicht versteht oder ihn
nicht als „für mich relevant" empfindet, formuliere ihn um oder lass ihn weg.

## Aufbau eines Eintrags

Jeder Eintrag hat **genau diese Struktur**:

```md
# vX.Y — TT.MM.JJJJ

Ein sachlicher Satz, der zusammenfasst, worum es in dieser Version geht.

**Features:**
- Etwas Neues, das es vorher nicht gab.

**Changes:**
- Etwas Bestehendes, das jetzt anders oder komfortabler ist.

**Bugfixes:**
- Etwas, das vorher nicht richtig funktioniert hat und jetzt behoben ist.
```

Regeln zur Struktur:

- **Überschrift:** `# v` + Versionsnummer + ` — ` + Datum im Format `TT.MM.JJJJ`.
  Das Format muss exakt so sein, damit die App die Version korrekt erkennt.
- **Zusammenfassung:** ein kurzer, sachlicher Satz direkt unter der Überschrift,
  der den Schwerpunkt der Version benennt. Er ordnet ein, er wirbt nicht. Zwei
  Sätze nur, wenn die Version wirklich zwei Schwerpunkte hat.
- **Drei Abschnitte** in dieser Reihenfolge: `**Features:**`, `**Changes:**`,
  `**Bugfixes:**`. In der App heißen sie für den Nutzer „Neu", „Verbessert" und
  „Behoben".
- Ordne jede Änderung dem passenden Abschnitt zu:
  - **Features** = komplett neu.
  - **Changes** = vorhandenes verändert oder verbessert.
  - **Bugfixes** = Fehler behoben.
- Hat ein Abschnitt keine Punkte, **lass ihn ganz weg** (keine leeren
  Überschriften), damit der Changelog aufgeräumt bleibt.

## Versionsnummer wählen

Dieses Projekt nutzt **kein SemVer**. Es gibt genau zwei Formen:

- **Vollwertige Version — `vX.Y`**, z. B. `v1.2`, `v1.3`. Das ist der Normalfall
  für alles, was neue Features oder Änderungen enthält.
- **Bugfix-Version — `vX.Y.Z`**, z. B. `v1.2.1`, `v1.3.1`. Nur dann, wenn eine
  bereits veröffentlichte Version einen **wichtigen Bugfix** nachgereicht bekommt,
  ohne dass Features oder Änderungen dazukommen.

Die dritte Stelle bedeutet also ausschließlich „Bugfix zu der Version davor" —
niemals „kleines Feature". Eine Nummer wie `v1.2.0` gibt es nicht.

**Die Versionsnummer wird niemals eigenmächtig gesetzt.** Sieh dir die oberste
Version in der Datei an, leite daraus einen Vorschlag ab (Features/Changes →
nächste vollwertige Version; nur wichtige Bugfixes → Bugfix-Version) und **frage
den Nutzer vor dem Schreiben um Bestätigung**. Erst nach seiner Antwort wird der
Eintrag geschrieben. Das Datum ist standardmäßig **heute**.

## Vorgehen

1. Öffne `./CHANGELOG.md` in der Repository-Wurzel und sieh dir die oberste
   Version und den Schreibstil der bestehenden Einträge an.
2. Kläre, welche Änderungen ins Release gehören. Sichte, was seit der letzten
   Version tatsächlich für Nutzer sichtbar neu oder anders ist (z. B. anhand der
   Commits oder der Beschreibung des Nutzers) — aber **übersetze alles in
   nutzerorientierte Sprache**.
3. Schlage die neue Versionsnummer vor und **hole die Bestätigung des Nutzers
   ein**. Datum ist heute.
4. Formuliere die Zusammenfassung und die Punkte für Features / Changes /
   Bugfixes — je ein Satz, neutral, sachlich, nicht technisch.
5. Füge den neuen Eintrag **ganz oben** in die Datei ein (über der bisher
   neuesten Version), getrennt durch eine Leerzeile.
6. Prüfe zum Schluss gegen diese Liste:
   - Steht irgendwo ein technischer Begriff? → umformulieren.
   - Ist ein Punkt länger als ein Satz? → aufteilen oder kürzen.
   - Steht irgendwo „Du" / „Dein" oder ein werblicher Ton? → neutral umschreiben.
   - Beschreibt ein Punkt eine interne Änderung ohne sichtbare Wirkung? →
     streichen.

## Beispiel

Aus einer technischen Änderung wie *„FixedCost-Copy-Endpoint + Drag&Drop-Sortierung
der Kategorien implementiert"* wird für den Nutzer:

```md
# v1.2 — 15.09.2026

Die monatliche Planung wurde um die Übernahme von Fixkosten und eine freie Sortierung der Kategorien erweitert.

**Features:**
- Fixkosten können mit einem Klick aus dem Vormonat übernommen werden.

**Changes:**
- Kategorien lassen sich per Ziehen und Ablegen in eine eigene Reihenfolge bringen.
```

## Wann dieser Skill zwingend läuft

Jede abgeschlossene Arbeit an dieser Anwendung — Feature, Change oder Bugfix —
endet mit einem Changelog-Eintrag über diesen Skill. Die Skills
`finance-fullstack-feature`, `finance-feature-delivery` und `finance-bugfix`
führen ihn als letzten Pflichtschritt aus. Ausgenommen sind nur Arbeiten ohne
jede für Nutzer sichtbare Wirkung (reine Werkzeug-, Dokumentations- oder
Build-Änderungen) — in diesem Fall wird ausdrücklich vermerkt, dass kein Eintrag
nötig ist, statt ihn stillschweigend wegzulassen.
