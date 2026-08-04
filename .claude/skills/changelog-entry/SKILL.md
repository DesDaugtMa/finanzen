---
name: changelog-entry
description: >-
  Schreibt einen neuen Changelog-Eintrag für die Fitness-App und fügt ihn oben in
  die Datei ./Source/Fitness.API/CHANGELOG.md ein. Nutze diesen Skill, wenn der
  Nutzer eine neue Version veröffentlichen, den Changelog aktualisieren, „einen
  Changelog-Eintrag schreiben", „release notes erstellen" oder Änderungen für
  Benutzer dokumentieren will. Der Changelog richtet sich AUSSCHLIESSLICH an
  normale Endnutzer — niemals technisch schreiben, keine Klassennamen, Endpunkte,
  Dateien, Frameworks oder Implementierungsdetails. Es zählt nur, was der Nutzer
  in der App sieht oder anders erlebt.
---

# Changelog-Eintrag schreiben

Du schreibst Release Notes für die **Fitness-App**. Deine Leser sind **ganz
normale Benutzer** — Menschen, die trainieren, keine Entwickler. Sie interessiert
nur: *Was ist neu, was ist anders, was funktioniert jetzt wieder?* Nichts sonst.

Die Datei liegt unter **`./Source/Fitness.API/CHANGELOG.md`**. Neue Einträge
kommen **immer ganz nach oben** (neueste Version zuerst). Das Frontend liest die
oberste Versionsnummer aus und zeigt sie als Link „vX.Y.Z – Changelog" an.

## Die goldene Regel: nicht technisch

Der Changelog wird nur von Endnutzern gelesen. Deshalb:

- **Niemals** Klassen-, Datei-, Methoden-, Tabellen-, Endpunkt- oder
  Framework-Namen nennen. Keine Begriffe wie „Service", „Controller", „Migration",
  „Refactoring", „Interface", „DTO", „Cache", „Query".
- **Keine internen Umbauten** erwähnen, die der Nutzer nicht bemerkt. Wenn sich an
  der Bedienung nichts ändert, gehört es nicht in den Changelog.
- Beschreibe **den sichtbaren Nutzen**, nicht die Umsetzung. Statt „Neuer
  Endpunkt für Wochenstatistiken" → „Du siehst jetzt, wie viele Trainings du pro
  Woche geschafft hast."
- Schreibe **freundlich, kurz und in Du-Form**, so wie der restliche Changelog.
- Jeder Punkt ist **ein Satz**, oberflächlich und verständlich — keine
  Aufzählung technischer Details.

Faustregel: Wenn ein Freund ohne IT-Wissen den Punkt nicht versteht oder ihn
nicht als „für mich relevant" empfindet, formuliere ihn um oder lass ihn weg.

## Aufbau eines Eintrags

Jeder Eintrag hat **genau diese Struktur**:

```md
# vX.Y.Z — TT.MM.JJJJ

Ein bis zwei Sätze, die das Update allgemein und positiv zusammenfassen.

**Features:**
- Etwas Neues, das es vorher nicht gab.

**Changes:**
- Etwas Bestehendes, das jetzt anders, besser oder komfortabler ist.

**Bugfixes:**
- Etwas, das vorher nicht richtig funktioniert hat und jetzt behoben ist.
```

Regeln zur Struktur:

- **Überschrift:** `# v` + Versionsnummer + ` — ` + Datum im Format `TT.MM.JJJJ`.
  Das Format muss exakt so sein, damit die App die Version korrekt erkennt.
- **Beschreibung:** kurzer, allgemein verständlicher Absatz direkt unter der
  Überschrift.
- **Drei Abschnitte** in dieser Reihenfolge: `**Features:**`, `**Changes:**`,
  `**Bugfixes:**`.
- Ordne jede Änderung dem passenden Abschnitt zu:
  - **Features** = komplett neu.
  - **Changes** = vorhandenes verbessert/verändert.
  - **Bugfixes** = Fehler behoben.
- Hat ein Abschnitt keine Punkte, **lass ihn ganz weg** (keine leeren
  Überschriften), damit der Changelog aufgeräumt bleibt.

## Versionsnummer wählen (SemVer)

Schau dir die oberste Version in der Datei an und erhöhe passend:

- **Patch** (x.y.**Z**): nur Bugfixes / kleine Verbesserungen.
- **Minor** (x.**Y**.0): neue Features, keine grundlegende Umstellung.
- **Major** (**X**.0.0): große Neuerung oder komplett überarbeitete App.

Frage den Nutzer nach der Versionsnummer, wenn sie nicht klar aus dem Umfang der
Änderungen hervorgeht. Das Datum ist standardmäßig **heute**.

## Vorgehen

1. Öffne `./Source/Fitness.API/CHANGELOG.md` und sieh dir die oberste Version und
   den Schreibstil der bestehenden Einträge an.
2. Kläre bei Bedarf, welche Änderungen ins Release gehören. Sichte, was seit der
   letzten Version tatsächlich für Nutzer sichtbar neu/anders ist (z. B. anhand
   von Commits oder der Beschreibung des Nutzers) — aber **übersetze alles in
   nutzerorientierte Sprache**.
3. Wähle die neue Versionsnummer (SemVer) und das Datum (heute).
4. Formuliere die Beschreibung und die Punkte für Features / Changes / Bugfixes —
   kurz, freundlich, nicht technisch.
5. Füge den neuen Eintrag **ganz oben** in die Datei ein (über der bisher
   neuesten Version), getrennt durch eine Leerzeile.
6. Prüfe zum Schluss: Steht irgendwo ein technischer Begriff? Dann umformulieren.

## Kurzes Beispiel

Aus einer technischen Änderung wie *„WeeklyScheduleOverride-Feature +
Drag&Drop-Reihenfolge im Wochenplan implementiert"* wird für den Nutzer:

```md
# v1.1.0 — 15.07.2026

Dein Wochenplan lässt sich jetzt noch flexibler an deinen Alltag anpassen.

**Features:**
- Du kannst deine Trainingstage per Ziehen und Ablegen in eine neue Reihenfolge bringen.

**Changes:**
- Anpassungen an deinem Wochenplan werden sofort übernommen, ohne dass die Seite neu lädt.
```
