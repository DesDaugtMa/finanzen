# Deployment

Vollständige Anleitung, wie die Finanzen-Applikation auf den vServer gebracht
wird — vom Erzeugen einer Migration bis zur Verifikation im Browser, inklusive
Einmal-Einrichtung, Notfall-Deploy ohne Pipeline, Fehlerbehandlung und Rollback.

> **Geheimnisse:** In diesem Dokument stehen alle Namen, Pfade, Ports und
> Domains konkret. Passwörter, Tokens und Secrets stehen ausschließlich als
> `<PLATZHALTER>`. Trage sie niemals in dieses Dokument ein.

---

## Inhalt

1. [Überblick](#1-überblick)
2. [Voraussetzungen](#2-voraussetzungen)
3. [Der reguläre Release-Ablauf](#3-der-reguläre-release-ablauf)
4. [Migrationen im Detail](#4-migrationen-im-detail)
5. [Pipeline manuell starten und beobachten](#5-pipeline-manuell-starten-und-beobachten)
6. [Notfall: manueller Deploy ohne Pipeline](#6-notfall-manueller-deploy-ohne-pipeline)
7. [Einmalige Server-Einrichtung](#7-einmalige-server-einrichtung)
8. [Konfiguration und Secrets](#8-konfiguration-und-secrets)
9. [Troubleshooting](#9-troubleshooting)
10. [Rollback](#10-rollback)
11. [Backups](#11-backups)
12. [Kurz-Checklisten](#12-kurz-checklisten)

---

## 1. Überblick

### Zielumgebung

| Was | Wert |
| --- | --- |
| Domain | `https://finanzen.alexander-friedrich.at` |
| Server-IP | `185.248.140.23` |
| SSH-Zugang | `ssh root@finanzen.alexander-friedrich.at` |
| Betriebssystem-User der App | `finanzen` (System-User, kein Home, kein Login-Shell) |
| Backend-Verzeichnis | `/opt/finanzen/app` |
| Backend-Binary | `/opt/finanzen/app/Finanzen.API` |
| Frontend (statisch) | `/opt/finanzen/app/wwwroot` |
| systemd-Service | `finanzen.service`, lauscht auf `http://localhost:5002` |
| Reverse Proxy | nginx, Site `/etc/nginx/sites-available/finanzen.alexander-friedrich.at` |
| Datenbank | PostgreSQL, Datenbank `finanzen_db`, User `finanzen` |
| Runtime-Secrets | `/etc/finanzen/finanzen.env` |
| GitHub-Runner | `github-runner-finanzen.service`, Verzeichnis `/opt/finanzen/runner` |
| Repository | `https://github.com/DesDaugtMa/finanzen` |

nginx serviert das Angular-Bundle aus `wwwroot` und leitet alles unter `/api/`
an `http://localhost:5002` weiter. Deshalb steht in
[`appconfig.json`](../Source/Frontend/public/assets/config/appconfig.json) die
`baseUrl` auf `"/"` — das Frontend spricht dieselbe Origin an wie die Seite
selbst, es gibt in Produktion keinen Cross-Origin-Aufruf.

### Wie ein Deploy abläuft

Der Deploy ist **vollautomatisch** und läuft über
[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml). Besonderheit:
Der GitHub-Actions-Runner ist **self-hosted und läuft direkt auf dem vServer**
(`runs-on: [self-hosted, finanzen]`). Bauen, Migrieren und Ausrollen passieren
also alle lokal auf dem Zielserver — es wird nichts über das Netz kopiert.

Auslöser: **jeder Push auf `main`** oder ein manueller `workflow_dispatch`.

Die Schritte in der Reihenfolge, in der sie laufen:

1. **Checkout** des Repositories in den Workspace des Runners.
2. **`dotnet tool restore`** — installiert `dotnet-ef` in der in
   [`.config/dotnet-tools.json`](../.config/dotnet-tools.json) gepinnten Version
   (aktuell `10.0.9`).
3. **`dotnet publish`** von `Backend.API` nach `<workspace>/publish/backend`.
4. **`dotnet ef database update`** gegen `finanzen_db`, mit dem
   Connection-String aus dem GitHub-Secret `DB_CONNECTION_STRING`. Das
   `--connection`-Argument übergeht die DesignTime-Factory, damit garantiert die
   Produktions-DB getroffen wird und nicht ein Dev-Fallback.
5. **`npm ci` + `npm run build -- --configuration production`** im Frontend.
6. **`sudo systemctl stop finanzen.service`** — der `finanzen`-User darf per
   sudoers-Regel genau `start`, `stop` und `restart` für diesen einen Service,
   sonst nichts.
7. **Backend-Dateien ersetzen:** alles unter `/opt/finanzen/app` außer `wwwroot`
   wird gelöscht, dann wird das Publish-Ergebnis hineinkopiert.
8. **Frontend-Dateien ersetzen:** `wwwroot` wird geleert und mit
   `Source/Frontend/dist/Frontend/browser` befüllt.
9. **`sudo systemctl start finanzen.service`**.
10. **Health-Check:** bis zu 15 Versuche im 2-Sekunden-Takt gegen
    `http://localhost:5002/api/auth/validate-token/healthcheck`. Antwortet der
    Server mit irgendeinem HTTP-Status (also nicht `000`), gilt der Deploy als
    erfolgreich. Schlägt es fehl, gibt der Workflow die letzten 50 Zeilen aus
    `journalctl -u finanzen.service` aus und bricht ab.

**Wichtig zu wissen:**

- Die App führt beim Start **keine** Migrationen aus. Das Schema wird
  ausschließlich in Schritt 4 der Pipeline aktualisiert (oder manuell, siehe
  [Abschnitt 4](#4-migrationen-im-detail)).
- Zwischen Schritt 6 und 9 ist die Anwendung **kurz nicht erreichbar** (nginx
  liefert dann `502`). Das ist normal und dauert wenige Sekunden.
- `concurrency: deploy-finanzen` mit `cancel-in-progress: false` stellt sicher,
  dass nie zwei Deploys gleichzeitig laufen. Ein zweiter Push wartet, bis der
  erste durch ist.

### Die Reihenfolge Migration vor Deploy ist kein Zufall

Das Schema wird aktualisiert, **bevor** die neuen Binaries laufen. Solange die
Migration additiv ist (neue Spalte, neue Tabelle), verträgt das noch laufende
alte Backend das problemlos. Bei **destruktiven** Migrationen (Spalte löschen,
umbenennen, Typ ändern) läuft für die Dauer des Deploys altes Backend gegen
neues Schema — das kann Fehler werfen. Bei solchen Änderungen entweder eine
Wartungsminute in Kauf nehmen oder die Migration in zwei Releases aufteilen
(erst additiv ausrollen, dann im Folgerelease das Alte entfernen).

---

## 2. Voraussetzungen

Lokal auf dem Entwicklungsrechner:

| Werkzeug | Zweck | Prüfen |
| --- | --- | --- |
| .NET 10 SDK | Backend bauen, Migrationen erzeugen | `dotnet --version` |
| Node.js + npm 11+ | Frontend bauen | `node --version` und `npm --version` |
| Git | Versionierung | `git --version` |
| GitHub CLI (`gh`) | Pipeline starten/beobachten (optional) | `gh --version` |
| `psql` / `pg_dump` | nur für manuelle Migration und Backups (optional) | `psql --version` |

`dotnet-ef` muss **nicht** global installiert werden — es ist als lokales Tool
im Repository gepinnt:

```powershell
dotnet tool restore
```

Für Zugriff auf den Server zusätzlich das Root-Passwort des vServers (siehe
`Fitness.ServerSetup`, Feld `rootPassword`).

---

## 3. Der reguläre Release-Ablauf

Der Standardweg von der fertigen Arbeit im Feature-Branch bis zur laufenden
Version auf dem Server. Schritt 1 und 2 entfallen, wenn sich am Datenmodell
nichts geändert hat.

### Schritt 1 — Migration erzeugen (nur bei Schemaänderung)

Wenn eine Entity, ein `DbSet` oder eine Konfiguration in
[`Source/Backend/Backend.DataAccess/`](../Source/Backend/Backend.DataAccess/)
geändert wurde, braucht es eine Migration. Aus der **Repository-Wurzel**:

```powershell
dotnet ef migrations add <AussagekraeftigerName> `
  --project Source/Backend/Backend.DataAccess/Backend.DataAccess.csproj `
  --startup-project Source/Backend/Backend.API/Backend.API.csproj
```

Namenskonvention wie bei den bestehenden Migrationen: `PascalCase`, beschreibt
die Änderung — `AddDebtEntries`, `AddTransactionIsPending`,
`RemoveDisplayName`.

Erzeugt drei Dateien in
[`Source/Backend/Backend.DataAccess/Migrations/`](../Source/Backend/Backend.DataAccess/Migrations/):
`<Zeitstempel>_<Name>.cs`, `<Zeitstempel>_<Name>.Designer.cs` und die
aktualisierte `AppDbContextModelSnapshot.cs`. **Alle drei müssen eingecheckt
werden.**

> **Immer nachlesen, was EF generiert hat.** EF Core erkennt eine Umbenennung
> nicht zuverlässig und macht daraus gerne `DropColumn` + `AddColumn` — das
> löscht Produktionsdaten. Öffne die generierte `.cs`-Datei und prüfe, ob `Up()`
> das tut, was gemeint war. Bei Umbenennungen die Datei von Hand auf
> `RenameColumn` korrigieren.

### Schritt 2 — Idempotentes SQL-Skript aktualisieren

```powershell
./Database/Generate-MigrationScript.ps1
```

Schreibt [`Database/migrations-idempotent.sql`](../Database/migrations-idempotent.sql)
neu. Diese Datei ist das Sicherheitsnetz für den manuellen Weg
([Abschnitt 6](#6-notfall-manueller-deploy-ohne-pipeline)); die Pipeline selbst
nutzt sie nicht. Sie muss trotzdem **nach jeder neuen Migration neu erzeugt und
mit eingecheckt werden**, sonst ist sie im Notfall veraltet und unbrauchbar.

Details zu Optionen und zum manuellen Anwenden stehen in
[`Database/README.md`](../Database/README.md).

### Schritt 3 — Lokal bauen

Nichts geht nach `main`, was nicht lokal fehlerfrei baut.

```powershell
# Backend
dotnet build Source/Backend/Backend.slnx -c Release

# Frontend
cd Source/Frontend
npm ci
npm run build -- --configuration production
cd ../..
```

`npm ci` (nicht `npm install`) — es installiert exakt die Versionen aus
`package-lock.json`, genau wie die Pipeline es tut. Der Production-Build prüft
zusätzlich die Bundle-Budgets aus `angular.json` (Warnung ab 2 MB, Fehler ab
3 MB im Initial-Bundle).

Tests, falls für die Änderung vorhanden:

```powershell
cd Source/Frontend
npm test
```

### Schritt 4 — Changelog schreiben

Jede für Nutzer sichtbare Änderung gehört in [`CHANGELOG.md`](../CHANGELOG.md)
in der Repository-Wurzel. Die Datei wird beim Publish neben die Binaries kopiert
(siehe `Backend.API.csproj`) und **in der Applikation selbst angezeigt** — ein
vergessener Eintrag fällt den Nutzern also auf.

### Schritt 5 — Änderungen nach `main` bringen

Der Push auf `main` **ist** der Deploy-Auslöser. Alles davor ist Vorbereitung.

```powershell
# Auf dem Feature-Branch: alles committen
git add .
git commit -m "#<IssueNummer> - <Kurzbeschreibung>"
git push

# Nach main mergen
git checkout main
git pull
git merge <FeatureBranch>
git push
```

Alternativ über einen Pull Request auf GitHub — das Mergen des PRs löst
denselben Push auf `main` aus.

> Ab diesem Moment läuft der Deploy. Ab hier gibt es keinen Abbruch-Knopf mehr,
> der die Datenbankmigration rückgängig macht.

### Schritt 6 — Pipeline beobachten

Im Browser: Repository → **Actions** → Workflow **„Deploy Finanzen"** → oberster
Lauf.

Oder im Terminal:

```powershell
gh run watch
```

Ein Durchlauf dauert typischerweise wenige Minuten, das Meiste davon `npm ci`
und der Angular-Build.

### Schritt 7 — Nach dem Deploy verifizieren

1. `https://finanzen.alexander-friedrich.at` im Browser öffnen und **hart neu
   laden** (`Strg`+`Shift`+`R`). Wegen `outputHashing: all` bekommen alle
   Bundles bei jedem Build neue Dateinamen — ein normaler Reload zeigt trotzdem
   manchmal noch die alte `index.html` aus dem Cache.
2. Einloggen und die geänderte Funktion durchklicken.
3. Den Changelog in der App aufrufen: steht die neue Version drin, läuft
   tatsächlich das neue Backend.
4. Bei Zweifeln auf dem Server nachsehen:

```bash
systemctl status finanzen.service
journalctl -u finanzen.service -n 50 --no-pager
```

---

## 4. Migrationen im Detail

Alle Befehle aus der **Repository-Wurzel**. Die beiden Projektpfade sind bei
jedem `dotnet ef`-Aufruf nötig, weil der `DbContext` in `Backend.DataAccess`
liegt, die Konfiguration aber in `Backend.API`.

### Migration hinzufügen

```powershell
dotnet ef migrations add <Name> `
  --project Source/Backend/Backend.DataAccess/Backend.DataAccess.csproj `
  --startup-project Source/Backend/Backend.API/Backend.API.csproj
```

### Letzte Migration wieder entfernen

Nur solange sie **noch nirgends angewendet** wurde:

```powershell
dotnet ef migrations remove `
  --project Source/Backend/Backend.DataAccess/Backend.DataAccess.csproj `
  --startup-project Source/Backend/Backend.API/Backend.API.csproj
```

Ist sie bereits auf der lokalen Datenbank angewendet, vorher zurückrollen (siehe
unten „Migration zurückrollen"). Ist sie bereits auf **Produktion** angewendet,
darf sie nicht mehr entfernt werden — stattdessen eine neue Migration schreiben,
die die Änderung rückgängig macht.

### Vorhandene Migrationen auflisten

```powershell
dotnet ef migrations list `
  --project Source/Backend/Backend.DataAccess/Backend.DataAccess.csproj `
  --startup-project Source/Backend/Backend.API/Backend.API.csproj
```

### Migrationen auf die lokale Entwicklungs-Datenbank anwenden

```powershell
dotnet ef database update `
  --project Source/Backend/Backend.DataAccess/Backend.DataAccess.csproj `
  --startup-project Source/Backend/Backend.API/Backend.API.csproj
```

Ohne `--connection` greift die DesignTime-Factory, also die Entwicklungs-DB.

### Migrationen auf die Produktions-Datenbank anwenden

Das erledigt normalerweise die Pipeline. Von Hand — nur mit vorherigem Backup
([Abschnitt 11](#11-backups)) und nur, wenn ein direkter Netzwerkzugang zur DB
besteht (standardmäßig lauscht PostgreSQL nur auf `localhost`, also praktisch:
auf dem Server selbst):

```powershell
dotnet ef database update `
  --project Source/Backend/Backend.DataAccess/Backend.DataAccess.csproj `
  --startup-project Source/Backend/Backend.API/Backend.API.csproj `
  --connection "Host=localhost;Database=finanzen_db;Username=finanzen;Password=<DB_PASSWORT>"
```

### Migration zurückrollen

Auf einen bestimmten Stand zurück (die Ziel-Migration bleibt angewendet, alles
danach wird zurückgerollt):

```powershell
dotnet ef database update <ZielMigrationsId> `
  --project Source/Backend/Backend.DataAccess/Backend.DataAccess.csproj `
  --startup-project Source/Backend/Backend.API/Backend.API.csproj
```

Alles zurückrollen: statt der Id eine `0` angeben.

> Das funktioniert nur, wenn die betroffenen Migrationen ein sauberes `Down()`
> haben. In Produktion ist ein Zurückrollen fast immer die schlechtere Wahl
> gegenüber einer Wiederherstellung aus dem Backup — `Down()` stellt gelöschte
> Daten nicht wieder her.

### Aktuellen Stand der Produktions-DB abfragen

Auf dem Server:

```bash
sudo -u postgres psql -d finanzen_db -c 'SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY "MigrationId";'
```

### Idempotentes SQL-Skript erzeugen

```powershell
# Alle Migrationen (Standard)
./Database/Generate-MigrationScript.ps1

# Nur ab einem bestimmten Stand
./Database/Generate-MigrationScript.ps1 -From 20260814095103_AddTransactionIsPending -OutFile Database/nur-neue.sql
```

### Idempotentes SQL-Skript anwenden

```powershell
./Database/Apply-MigrationScript.ps1 -ConnectionString "postgresql://finanzen:<DB_PASSWORT>@localhost:5432/finanzen_db"
```

Oder direkt auf dem Server ohne PowerShell:

```bash
psql --set ON_ERROR_STOP=on \
     -d "postgresql://finanzen:<DB_PASSWORT>@localhost:5432/finanzen_db" \
     -f migrations-idempotent.sql
```

Das Skript kapselt jede Migration in `IF NOT EXISTS(... __EFMigrationsHistory ...)`
und in eine eigene Transaktion. Es kann gegen eine Datenbank mit beliebigem
Stand laufen und wendet nur die fehlenden an; nach einem Abbruch bleiben die
bereits erfolgreichen Migrationen erhalten und das Skript kann nach der Korrektur
einfach erneut laufen.

---

## 5. Pipeline manuell starten und beobachten

### Ohne Code-Änderung deployen

Der Workflow hat `workflow_dispatch: {}`, kann also jederzeit von Hand gestartet
werden — nützlich, wenn ein Deploy fehlgeschlagen ist und die Ursache auf dem
Server behoben wurde.

Im Browser: Repository → **Actions** → **„Deploy Finanzen"** → **Run workflow** →
Branch `main` → **Run workflow**.

Im Terminal:

```powershell
gh workflow run "Deploy Finanzen" --ref main
```

### Läufe ansehen

```powershell
# Letzte Läufe auflisten
gh run list --workflow "Deploy Finanzen"

# Laufenden Deploy live mitverfolgen
gh run watch

# Vollständiges Log eines Laufs
gh run view <RunId> --log

# Nur die fehlgeschlagenen Schritte
gh run view <RunId> --log-failed
```

### Läuft der Runner überhaupt?

Bleibt ein Lauf in „Queued" hängen, ist meist der Runner auf dem Server nicht
aktiv:

```bash
systemctl status github-runner-finanzen.service
systemctl restart github-runner-finanzen.service
```

Der Status ist auch im Browser sichtbar unter Repository → Settings → Actions →
Runners: der Runner mit Label `finanzen` muss „Idle" sein, nicht „Offline".

---

## 6. Notfall: manueller Deploy ohne Pipeline

Zu verwenden, wenn der Runner tot ist, GitHub Actions gestört ist oder ein
dringender Fix sofort raus muss. Der Ablauf bildet die Pipeline-Schritte von
Hand nach.

### Variante A — direkt auf dem Server bauen (bevorzugt)

Das Repository ist auf dem Server ohnehin im Runner-Workspace vorhanden, und
.NET SDK sowie Node sind installiert. Der Weg ist am nächsten am regulären
Deploy.

```bash
ssh root@finanzen.alexander-friedrich.at

# Als finanzen-User arbeiten, mit gesetztem HOME (der User hat keins)
sudo -u finanzen -H bash
export HOME=/opt/finanzen
export DOTNET_CLI_HOME=/opt/finanzen

cd /opt/finanzen/deploy-manual
git clone https://github.com/DesDaugtMa/finanzen.git . 2>/dev/null || git pull
git checkout main

# Backend bauen
dotnet tool restore
dotnet publish Source/Backend/Backend.API/Backend.API.csproj -c Release -o /tmp/publish-backend

# Migrationen anwenden
dotnet ef database update \
  --project Source/Backend/Backend.DataAccess/Backend.DataAccess.csproj \
  --startup-project Source/Backend/Backend.API/Backend.API.csproj \
  --connection "Host=localhost;Database=finanzen_db;Username=finanzen;Password=<DB_PASSWORT>"

# Frontend bauen
cd Source/Frontend && npm ci && npm run build -- --configuration production && cd -

# Ausrollen
sudo systemctl stop finanzen.service
find /opt/finanzen/app -mindepth 1 -maxdepth 1 ! -name wwwroot -exec rm -rf {} +
cp -a /tmp/publish-backend/. /opt/finanzen/app/
rm -rf /opt/finanzen/app/wwwroot/*
cp -a Source/Frontend/dist/Frontend/browser/. /opt/finanzen/app/wwwroot/
sudo systemctl start finanzen.service

# Prüfen
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5002/api/auth/validate-token/healthcheck
```

### Variante B — lokal bauen, per scp hochladen

Wenn auf dem Server nicht gebaut werden kann. Lokal:

```powershell
# Backend publishen
dotnet publish Source/Backend/Backend.API/Backend.API.csproj -c Release -o publish/backend

# Frontend bauen
cd Source/Frontend
npm ci
npm run build -- --configuration production
cd ../..

# Hochladen (Zwischenablage im /tmp, weil /opt/finanzen dem finanzen-User gehört)
scp -r publish/backend/* root@finanzen.alexander-friedrich.at:/tmp/backend-upload/
scp -r Source/Frontend/dist/Frontend/browser/* root@finanzen.alexander-friedrich.at:/tmp/frontend-upload/
```

Auf dem Server:

```bash
# Migrationen zuerst (idempotentes Skript aus dem Repo, siehe Abschnitt 4)
psql --set ON_ERROR_STOP=on \
     -d "postgresql://finanzen:<DB_PASSWORT>@localhost:5432/finanzen_db" \
     -f migrations-idempotent.sql

systemctl stop finanzen.service

find /opt/finanzen/app -mindepth 1 -maxdepth 1 ! -name wwwroot -exec rm -rf {} +
cp -a /tmp/backend-upload/. /opt/finanzen/app/

rm -rf /opt/finanzen/app/wwwroot/*
cp -a /tmp/frontend-upload/. /opt/finanzen/app/wwwroot/

# Rechte zurückgeben — sonst kann der finanzen-User seine eigenen Dateien nicht lesen
chown -R finanzen:finanzen /opt/finanzen/app
chmod +x /opt/finanzen/app/Finanzen.API

systemctl start finanzen.service
systemctl status finanzen.service
```

> Nach jedem manuellen Deploy: den nächsten regulären Pipeline-Lauf abwarten
> oder von Hand auslösen, damit Server-Stand und `main` garantiert wieder
> übereinstimmen.

---

## 7. Einmalige Server-Einrichtung

Diese Schritte sind **nur einmal** nötig — der Server ist bereits so
eingerichtet. Der Abschnitt dient der Nachvollziehbarkeit und dem Wiederaufbau
nach einem Totalausfall.

### 7.1 Provisionierung durch `Fitness.ServerSetup`

Der Grundzustand des Servers wurde mit dem Konsolen-Tool
`Source/Fitness.ServerSetup` aus dem **Nachbar-Repository `fitness`** erzeugt.
Es verbindet sich per SSH als `root` und arbeitet idempotente Phasen ab (jede
prüft vorher, ob sie schon erledigt ist):

| Phase | Inhalt |
| --- | --- |
| 00 | System-Update |
| 01 | System-User `fitness`, `finanzen`, `static` + Verzeichnisse unter `/opt` und `/var/backups` |
| 02 | Firewall |
| 03 | PostgreSQL inkl. Datenbank `finanzen_db` und User `finanzen` |
| 04 | .NET SDK/Runtime |
| 05 | Node.js und Angular CLI |
| 06 | nginx-Sites für alle drei Domains |
| 07 | certbot (Let's Encrypt), ergänzt die nginx-Sites um TLS und die HTTP→HTTPS-Weiterleitung |
| 08 | GitHub-Actions-Runner (einer je Projekt) als systemd-Services |
| 09 | App-Services `fitness.service` und `finanzen.service` + sudoers-Regeln |
| 10 | Health-Check-Skript |
| 11 | Datenbank-Backups per cron |
| 12 | Abschlussbericht |

Konfiguriert wird das Tool über `setup-config.json` (Server-IP, Domains,
DB-Passwörter, Repo-URLs, Runner-Registrierungstokens). Die Runner-Tokens holt
man sich unter Repository → Settings → Actions → Runners → New self-hosted
runner; sie sind nur kurz gültig.

Das Ergebnis für das Finanzen-Projekt:

- Verzeichnisse `/opt/finanzen/app/wwwroot`, `/opt/finanzen/runner`,
  `/opt/finanzen/backups`, `/var/backups/finanzen`, alle `chown finanzen:finanzen`.
- `finanzen.service` mit `ExecStart=/opt/finanzen/app/Finanzen.API`,
  `ASPNETCORE_URLS=http://localhost:5002`, `Restart=on-failure`.
- nginx-Site mit `root /opt/finanzen/app/wwwroot`, SPA-Fallback
  (`try_files $uri $uri/ /index.html`) und `location /api/` als Proxy auf
  `localhost:5002`.
- sudoers-Regel, die dem `finanzen`-User genau `systemctl start|stop|restart
  finanzen.service` ohne Passwort erlaubt.

> Der Binary-Name `Finanzen.API` ist kein Zufall: die systemd-Unit erwartet exakt
> diesen Pfad. Deshalb setzt
> [`Backend.API.csproj`](../Source/Backend/Backend.API/Backend.API.csproj)
> `<AssemblyName>Finanzen.API</AssemblyName>`, obwohl das Projekt `Backend.API`
> heißt. Diese beiden Namen dürfen nie auseinanderlaufen.

### 7.2 Runtime-Secrets einrichten

Die systemd-Unit aus dem Setup-Tool setzt nur den DB-Connection-String inline.
Alle übrigen Secrets kommen aus einer separaten Env-Datei, die manuell angelegt
werden muss.

**a) `EnvironmentFile` in die Unit eintragen:**

```bash
sed -i '/^\[Service\]/a EnvironmentFile=/etc/finanzen/finanzen.env' /etc/systemd/system/finanzen.service
```

**b) JWT-Secret erzeugen:**

```bash
openssl rand -base64 48
```

**c) `/etc/finanzen/finanzen.env` anlegen:**

```bash
mkdir -p /etc/finanzen
nano /etc/finanzen/finanzen.env
```

Inhalt (systemd-Syntax: `KEY=VALUE`, **keine** Anführungszeichen, **keine**
Leerzeichen um das `=`):

```ini
AppSettings__ConnectionStrings__Default=Host=localhost;Database=finanzen_db;Username=finanzen;Password=<DB_PASSWORT>
AppSettings__Jwt__Secret=<AUSGABE_VON_OPENSSL_RAND>
AppSettings__AllowedOrigins__0=https://finanzen.alexander-friedrich.at
AppSettings__FrontendBaseUrl=https://finanzen.alexander-friedrich.at
AppSettings__Smtp__Host=<SMTP_HOST>
AppSettings__Smtp__Port=587
AppSettings__Smtp__User=<SMTP_USER>
AppSettings__Smtp__Password=<SMTP_PASSWORT>
AppSettings__Smtp__FromAddress=<ABSENDER_ADRESSE>
AppSettings__Smtp__FromName=Finanzen
AppSettings__Smtp__UseSsl=true
```

**d) Rechte setzen und Unit neu laden:**

```bash
chown finanzen:finanzen /etc/finanzen/finanzen.env
chmod 600 /etc/finanzen/finanzen.env
systemctl daemon-reload
systemctl restart finanzen.service
```

> **Bekannte Stolperfalle — Key-Mismatch.** Die auf dem Server ausgerollte
> systemd-Unit stammt aus einer älteren Version des Setup-Tools und setzt inline
> `ConnectionStrings__DefaultConnection` — das ist der Key des längst abgelösten
> Projekts `Backend`. `Backend.API` liest jedoch
> `AppSettings__ConnectionStrings__Default`. Deshalb steht der Connection-String
> in der Env-Datei oben mit drin: Werte aus `EnvironmentFile` überschreiben die
> `Environment=`-Zeilen der Unit. Mit `systemctl cat finanzen.service` lässt sich
> prüfen, welche Variante tatsächlich installiert ist.

> **`AppSettings__GoogleAuth__ClientId` gehört nicht in diese Datei.** Die
> Google-Client-ID steht fest in
> [`appsettings.json`](../Source/Backend/Backend.API/appsettings.json) und
> [`appconfig.json`](../Source/Frontend/public/assets/config/appconfig.json) — sie
> ist kein Geheimnis, sie steckt ohnehin im Browser. Ein leerer oder falscher
> Wert in der Env-Datei würde `appsettings.json` überschreiben und den
> Google-Login mit `invalid_client` brechen. Falls die Zeile existiert: entfernen.

### 7.3 GitHub-Secrets hinterlegen

Repository → Settings → Secrets and variables → Actions:

| Name | Typ | Wert |
| --- | --- | --- |
| `DB_CONNECTION_STRING` | Secret | `Host=localhost;Database=finanzen_db;Username=finanzen;Password=<DB_PASSWORT>` |

Mehr braucht die Pipeline nicht. Insbesondere ist **keine** Variable
`GOOGLE_CLIENT_ID` mehr nötig — die ID steht seit Juli 2026 fest im Code.

### 7.4 DNS und TLS

`finanzen.alexander-friedrich.at` muss per A-Record auf `185.248.140.23` zeigen.
Das TLS-Zertifikat holt certbot (Phase 07) und erneuert es automatisch per
systemd-Timer. Prüfen:

```bash
certbot certificates
systemctl list-timers | grep certbot
nginx -t
```

---

## 8. Konfiguration und Secrets

### Woher das Backend seine Werte nimmt

Die Reihenfolge, spätere überschreiben frühere:

1. [`appsettings.json`](../Source/Backend/Backend.API/appsettings.json) —
   Standardwerte und Nicht-Geheimnisse (JWT-Issuer/Audience, Laufzeiten,
   Google-Client-ID). Secret-Felder stehen hier bewusst leer.
2. `appsettings.Production.json` — nur abweichende Log-Level.
3. `Environment=`-Zeilen der systemd-Unit.
4. `/etc/finanzen/finanzen.env` über `EnvironmentFile=`.

Verschachtelte Konfiguration wird in Umgebungsvariablen mit **doppeltem
Unterstrich** abgebildet: `AppSettings:Jwt:Secret` → `AppSettings__Jwt__Secret`.
Array-Einträge bekommen einen numerischen Index: `AppSettings__AllowedOrigins__0`.

| Schlüssel | Pflicht | Bedeutung |
| --- | --- | --- |
| `AppSettings__ConnectionStrings__Default` | ja | PostgreSQL-Verbindung |
| `AppSettings__Jwt__Secret` | ja | Signierschlüssel; fehlt er, **bricht die App beim Start ab** |
| `AppSettings__AllowedOrigins__0` | ja | CORS-Origin der Produktionsdomain |
| `AppSettings__FrontendBaseUrl` | ja | Basis für Links in E-Mails (Einladung, Passwort-Reset) |
| `AppSettings__GoogleAuth__ClientId` | nein | steht im Code; hier nur überschreiben, wenn wirklich nötig |
| `AppSettings__Smtp__*` | ja für E-Mail-Versand | Einladungen und Passwort-Reset |

### Woher das Frontend seine Werte nimmt

Angular lädt seine Konfiguration **zur Laufzeit**, nicht zur Buildzeit:
[`src/main.ts`](../Source/Frontend/src/main.ts) holt vor dem Bootstrap per
`fetch` die Datei `assets/config/appconfig.json` (im Dev-Modus
`appconfig.development.json`). Sie wird als Asset aus `public/` in den Build
kopiert.

Produktionsinhalt:

```json
{
  "api": {
    "baseUrl": "/",
    "googleClientId": "630451280567-...apps.googleusercontent.com"
  }
}
```

Das bedeutet: **die Datei liegt nach dem Deploy unter
`/opt/finanzen/app/wwwroot/assets/config/appconfig.json` und kann dort im Notfall
direkt editiert werden** — ein Neustart des Backends ist dafür nicht nötig, nur
ein Reload im Browser. Dauerhafte Änderungen gehören trotzdem ins Repository,
sonst überschreibt sie der nächste Deploy.

Frontend und Backend müssen **dieselbe** Google-Client-ID verwenden; das Backend
prüft sie als Audience des Google-Tokens. Zusätzlich muss die Produktionsdomain
in der Google Cloud Console als „Authorized JavaScript origin" eingetragen sein.

---

## 9. Troubleshooting

### Diagnose-Befehle

```bash
# Läuft der Service?
systemctl status finanzen.service

# Startfehler und Laufzeit-Logs
journalctl -u finanzen.service -n 100 --no-pager

# Live mitlesen
journalctl -u finanzen.service -f

# Welche Unit-Definition ist wirklich installiert?
systemctl cat finanzen.service

# nginx-Konfiguration syntaktisch prüfen
nginx -t

# Antwortet das Backend direkt, am Proxy vorbei?
curl -i http://localhost:5002/api/auth/validate-token/healthcheck

# Läuft der Runner?
systemctl status github-runner-finanzen.service

# Belegt der Port 5002 wirklich unser Prozess?
ss -tlnp | grep 5002
```

### Häufige Fehlerbilder

| Symptom | Wahrscheinliche Ursache | Behebung |
| --- | --- | --- |
| Pipeline bleibt in „Queued" | Runner offline | `systemctl restart github-runner-finanzen.service`; Runner-Status in den Repo-Settings prüfen |
| `home directory could not be determined` im Build-Schritt | `HOME`/`DOTNET_CLI_HOME` fehlen — der `finanzen`-User hat kein Home | Werden im Workflow als `env:` gesetzt; bei manuellen Aufrufen selbst exportieren |
| Schritt „Apply EF Core migrations" schlägt fehl | `DB_CONNECTION_STRING` falsch, DB nicht erreichbar, oder die Migration selbst ist fehlerhaft | Secret prüfen; `sudo -u postgres psql -d finanzen_db -c '\dt'`; Migrations-`Up()` lesen |
| Health-Check schlägt fehl, `journalctl` zeigt „JWT-Secret nicht konfiguriert" | `AppSettings__Jwt__Secret` fehlt oder die `EnvironmentFile=`-Zeile ist nicht in der Unit | [Abschnitt 7.2](#72-runtime-secrets-einrichten) |
| Health-Check schlägt fehl, Log zeigt DB-Verbindungsfehler | Key-Mismatch beim Connection-String | Korrekten Key `AppSettings__ConnectionStrings__Default` in die Env-Datei; `systemctl cat finanzen.service` |
| Browser zeigt `502 Bad Gateway` | Backend läuft nicht (abgestürzt oder Deploy mittendrin) | `systemctl status finanzen.service`, dann `journalctl` |
| Browser zeigt `404` auf Unterseiten, Startseite geht | nginx-SPA-Fallback fehlt | `try_files $uri $uri/ /index.html` in der Site; `nginx -t && systemctl reload nginx` |
| Seite lädt, aber alle API-Aufrufe scheitern | `baseUrl` in `appconfig.json` falsch, oder `/api/`-Proxy defekt | `appconfig.json` muss `"/"` sein; nginx-Site prüfen |
| Google-Login: `invalid_client` | Client-ID in Frontend und Backend unterschiedlich, oder Env-Datei überschreibt sie mit Leerwert | IDs abgleichen; `AppSettings__GoogleAuth__ClientId` aus der Env-Datei entfernen |
| App zeigt alten Stand trotz erfolgreichem Deploy | Browser-Cache / Service Worker | Hart neu laden (`Strg`+`Shift`+`R`); notfalls in den DevTools unter Application den Service Worker abmelden |
| Keine E-Mails (Einladung, Passwort-Reset) | `AppSettings__Smtp__*` unvollständig | Env-Datei prüfen, `journalctl` nach SMTP-Fehlern durchsuchen |
| Nach manuellem Deploy startet der Service nicht | Dateien gehören `root` statt `finanzen`, oder das Binary ist nicht ausführbar | `chown -R finanzen:finanzen /opt/finanzen/app`, `chmod +x /opt/finanzen/app/Finanzen.API` |
| TLS-Zertifikat abgelaufen | certbot-Timer inaktiv | `certbot renew --dry-run`, `systemctl list-timers \| grep certbot` |

---

## 10. Rollback

### Fall A — Nur der Code ist kaputt, das Schema ist unverändert

Der saubere Weg ist **vorwärts**: den Fehler beheben und neu deployen. Wenn es
schnell gehen muss, den fehlerhaften Commit auf `main` zurücknehmen — der
resultierende Push löst automatisch einen neuen Deploy aus, der wieder den alten
Stand ausrollt:

```powershell
git checkout main
git pull
git revert <FehlerhafterCommitSha>
git push
```

`revert` statt `reset --hard` + Force-Push: die Historie bleibt intakt und der
Push löst regulär die Pipeline aus.

### Fall B — Eine Migration hat Schaden angerichtet

Wenn Daten verloren gegangen sind, hilft nur das Backup. Auf dem Server:

```bash
# 1. Service anhalten, damit nichts weiterschreibt
systemctl stop finanzen.service

# 2. Aktuellen (kaputten) Stand zur Sicherheit trotzdem noch sichern
sudo -u postgres pg_dump finanzen_db | gzip > /var/backups/finanzen/vor-rollback-$(date +%F-%H%M).sql.gz

# 3. Verfügbare Backups ansehen
ls -lh /var/backups/finanzen/

# 4. Datenbank neu aufbauen und Backup einspielen
sudo -u postgres dropdb finanzen_db
sudo -u postgres createdb -O finanzen finanzen_db
gunzip -c /var/backups/finanzen/finanzen_<DATUM>.sql.gz | sudo -u postgres psql -d finanzen_db

# 5. Code auf den zum Backup passenden Stand zurückbringen (Fall A), dann
systemctl start finanzen.service
```

> Die automatischen Backups laufen **wöchentlich** (Sonntag 02:00). Zwischen
> zwei Läufen liegen also bis zu sieben Tage Datenverlust. Vor jeder riskanten
> Migration deshalb **von Hand ein Backup ziehen** — siehe
> [Abschnitt 11](#11-backups).

### Fall C — Nur die Binaries zurück, ohne Rebuild

Es gibt keine automatische Versionierung der ausgerollten Binaries. Wer diese
Möglichkeit braucht, sichert vor dem Deploy:

```bash
tar czf /opt/finanzen/backups/app-$(date +%F-%H%M).tar.gz -C /opt/finanzen/app .
```

Zurückspielen:

```bash
systemctl stop finanzen.service
rm -rf /opt/finanzen/app/*
tar xzf /opt/finanzen/backups/app-<STAND>.tar.gz -C /opt/finanzen/app
chown -R finanzen:finanzen /opt/finanzen/app
systemctl start finanzen.service
```

---

## 11. Backups

### Automatisch

Ein cron-Job (`/etc/cron.d/db-backup`) ruft **jeden Sonntag um 02:00**
`/usr/local/bin/db-backup.sh` auf. Das Skript legt einen gzip-komprimierten
`pg_dump` unter `/var/backups/finanzen/finanzen_<JJJJ-MM-TT>.sql.gz` ab und
löscht Dumps, die älter als 56 Tage sind (also acht Wochen Aufbewahrung).
Protokoll: `/var/log/fitness-backup.log`.

Prüfen:

```bash
cat /etc/cron.d/db-backup
ls -lh /var/backups/finanzen/
tail -n 20 /var/log/fitness-backup.log
```

### Von Hand, vor jeder riskanten Änderung

```bash
# Auf dem Server, gleiches Format wie die automatischen Backups
sudo -u postgres pg_dump finanzen_db | gzip > /var/backups/finanzen/finanzen-manuell-$(date +%F-%H%M).sql.gz

# Alternativ im Custom-Format (erlaubt selektives Wiederherstellen mit pg_restore)
pg_dump -Fc -h localhost -U finanzen -d finanzen_db -f finanzen-$(date +%F).dump
```

### Wiederherstellung testen

Ein Backup, das nie eingespielt wurde, ist keins. Auf einer Kopie testen — das
ist zugleich der einzige seriöse Weg, eine Migration vor Produktion zu proben,
denn ein echter Dry-Run ist nicht möglich (das erzeugte SQL bringt eigene
`START TRANSACTION`/`COMMIT`-Blöcke mit):

```bash
sudo -u postgres createdb finanzen_test
gunzip -c /var/backups/finanzen/finanzen_<DATUM>.sql.gz | sudo -u postgres psql -d finanzen_test
# Migration dagegen laufen lassen, prüfen, danach aufräumen:
sudo -u postgres dropdb finanzen_test
```

---

## 12. Kurz-Checklisten

### Vor dem Merge nach `main`

- [ ] Schemaänderung? Migration erzeugt, `Up()` gelesen und für korrekt befunden
- [ ] `./Database/Generate-MigrationScript.ps1` gelaufen, SQL-Datei eingecheckt
- [ ] Alle drei Migrationsdateien inklusive `AppDbContextModelSnapshot.cs` committet
- [ ] `dotnet build -c Release` fehlerfrei
- [ ] `npm ci && npm run build -- --configuration production` fehlerfrei
- [ ] Tests, sofern für die Änderung vorhanden, laufen durch
- [ ] `CHANGELOG.md` aktualisiert
- [ ] Bei destruktiver Migration: Backup gezogen und Zeitpunkt bewusst gewählt

### Nach dem Deploy

- [ ] Workflow „Deploy Finanzen" grün, insbesondere der Health-Check
- [ ] Seite lädt nach hartem Reload
- [ ] Login funktioniert (E-Mail/Passwort **und** Google)
- [ ] Die geänderte Funktion durchgeklickt
- [ ] Neue Version steht im Changelog innerhalb der App
- [ ] `journalctl -u finanzen.service -n 50 --no-pager` zeigt keine Fehler

### Es brennt

- [ ] `systemctl status finanzen.service` — läuft der Prozess?
- [ ] `journalctl -u finanzen.service -n 100 --no-pager` — was war der letzte Fehler?
- [ ] `nginx -t` und `curl -i http://localhost:5002/api/auth/validate-token/healthcheck` — Proxy oder Backend?
- [ ] Datenverlust? → Backup einspielen ([Abschnitt 10, Fall B](#fall-b--eine-migration-hat-schaden-angerichtet))
- [ ] Nur Code kaputt? → `git revert` und pushen ([Abschnitt 10, Fall A](#fall-a--nur-der-code-ist-kaputt-das-schema-ist-unverändert))

---

## Verwandte Dokumente

- [`Database/README.md`](../Database/README.md) — manuelle Migrationsskripte im Detail
- [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) — die Pipeline selbst
- [`CHANGELOG.md`](../CHANGELOG.md) — Versionshistorie
