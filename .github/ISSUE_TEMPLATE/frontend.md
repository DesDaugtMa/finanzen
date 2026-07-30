---
name: "Frontend Issue"
about: "Änderungen an Logik, Design oder UX im Frontend. NUR Änderungen in ./Source/Frontend/ — kein Backend-Code."
labels: ["Frontend"]
title: "[Frontend] "
---

<!--
  Titel-Format: [Frontend] + kurze Beschreibung im Imperativ
  Beispiel: [Frontend] Trainings-Übersicht auf Mobile optimieren
  Entferne Sektionen, die nicht zutreffen.

  SCOPE-REGEL: Dieses Template gilt ausschließlich für Änderungen in ./Source/Frontend/.
  Für Backend-Änderungen ein separates Issue erstellen.
-->

## 📋 Zusammenfassung
<!-- Ein Satz: Was soll neu möglich sein oder was soll sich ändern? -->


## 🎯 Motivation & Problem
<!-- Welches Problem löst diese Änderung? Für wen? Warum ist es wichtig?
     Format: „Als [Nutzerrolle] möchte ich [Ziel], damit [Mehrwert]." -->


---

## 💡 Beschreibung der Lösung
<!-- Wie soll das Feature/die Änderung funktionieren? Beschreibe das gewünschte Verhalten
     aus Nutzersicht. Kein Implementierungsdetail — das kommt weiter unten. -->


### Nicht im Scope
<!-- Was gehört explizit NICHT zu diesem Issue? -->

- Keine Backend-Änderungen
- 

---

## 🗺️ Wo
<!-- Welche Bereiche des Frontends sind betroffen? -->

| Feld              | Wert |
|-------------------|------|
| Route / URL       | `z.B. /training/overview` |
| Komponente(n)     | `z.B. training-overview.component.ts` |
| Service(s)        | `z.B. TrainingService` |
| SCSS-Datei(en)    | `z.B. training-overview.component.scss` |
| Branch            | `main` |

---

## 🎨 UX / Design
<!-- Mockups, Wireframes, Skizzen oder eine textuelle Beschreibung des UI-Verhaltens.
     Falls vorhanden, Figma-Link oder Screenshot als Anhang.
     Mobile-Ansicht beschreiben zuerst, Desktop-Anpassungen danach. -->

**Mobile (< 768 px):**

**Desktop (≥ 768 px):**

**PWA-spezifisches Verhalten (Standalone-Modus, Offline):**

---

## ⚙️ Technische Hinweise
<!-- Optional: Bekannte Abhängigkeiten, Architekturentscheidungen,
     Vorschläge zur Implementierung oder potenzielle Risiken. -->

- **Abhängigkeiten:** 
- **Offline-Relevanz:** Welche Daten müssen gecacht / im Service Worker hinterlegt werden?
- **Risiken / Breaking Changes:** 
- **Backend-Änderungen erforderlich:** `[ ] Ja  [ ] Nein` ← bei Ja: separates Issue erstellen

---

## ✅ Acceptance Criteria

### Funktional
- [ ] ...
- [ ] ...
- [ ] Fehlerfall ist behandelt und kommuniziert (Validierung, leere States, Ladezustände)
- [ ] Keine Regression in bestehenden Frontend-Funktionen

### Styleguide ([`./Documentation/Application/STYLE_GUIDE.md`](../../Documentation/Application/STYLE_GUIDE.md))
- [ ] Alle Farben, Abstände und Schatten referenzieren ausschließlich die in `styles.scss` definierten CSS Custom Properties (keine Magic Numbers, keine Inline-Styles mit Literal-Werten)
- [ ] Abstände sind Vielfache von `0.25 rem` (4 px-Raster) — keine Werte wie 3 px, 5 px, 7 px
- [ ] Bootstrap 5 wird als Fundament genutzt; eigene SCSS-Klassen erweitern Bootstrap, überschreiben es nicht ohne begründetes `!important`
- [ ] Animationen/Übergänge liegen zwischen 150 ms und 400 ms
- [ ] Jede erhöhte Fläche (Card, Toast, Modal) hat exakt eine der drei definierten Shadow-Stufen
- [ ] WCAG 2.1 AA erfüllt: Kontrast ≥ 4,5:1 für Text, ≥ 3:1 für UI-Elemente
- [ ] Alle interaktiven Elemente haben einen sichtbaren Fokus-Ring und (wo kein sichtbares Label existiert) ein ARIA-Label

### Mobile-First & Responsive
- [ ] Implementierung startet mit dem Mobile-Layout (< 768 px); Desktop-Anpassungen sind Erweiterungen davon
- [ ] Unter 768 px ist die Bottom-Navigation aktiv und alle Inhalte sind ohne horizontales Scrollen zugänglich
- [ ] Ab 768 px wechselt die Navigation auf die Sidebar; Layout nutzt das Bootstrap-Grid für die größere Viewport-Breite
- [ ] Alle Touch-Targets sind mindestens 44 × 44 px

### PWA & Offline
- [ ] Alle dargestellten Funktionen sind im PWA-Standalone-Modus vollständig nutzbar
- [ ] Offline-Szenarien sind berücksichtigt: betroffene Daten werden gecacht (Service Worker / IndexedDB) und stehen ohne Netzwerk zur Verfügung
- [ ] Der Nutzer erhält visuelles Feedback über den Offline-Status, wenn eine Aktion nicht sofort synchronisiert werden kann
- [ ] Keine Funktion der Applikation wird durch fehlende Netzwerkverbindung dauerhaft blockiert

---

## 🏁 Definition of Done

- [ ] Alle Acceptance Criteria erfüllt und von Reviewer bestätigt
- [ ] Änderungen ausschließlich in `./Source/Frontend/`
- [ ] Kein Backend-Code verändert
- [ ] Dokumentation / CHANGELOG aktualisiert (falls relevant)

---

## 🔗 Zusätzlicher Kontext
<!-- Verwandte Issues, externes Feedback, Analytics-Daten, Nutzer-Berichte -->

- Verwandte Issues: #
- Design-Datei / Figma: 
- Nutzer-Feedback / Quelle: 
