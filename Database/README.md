# Datenbank-Migrationen auf die Produktion anwenden

Normalerweise erledigt das der Deploy-Workflow (`.github/workflows/deploy.yml`,
Schritt *Apply EF Core migrations*). Diese Skripte sind für den manuellen Weg —
z. B. wenn die Datenbank vor einem Deploy hochgezogen werden soll oder der
Runner nicht laufen kann.

## 1. SQL-Skript erzeugen

```powershell
./Database/Generate-MigrationScript.ps1
```

Erzeugt `Database/migrations-idempotent.sql` aus allen EF-Core-Migrationen in
`Source/Backend/Backend.DataAccess/Migrations`.

Das Skript ist **idempotent**: Jede Migration ist einzeln in
`IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" ...)` gekapselt. Es kann
gegen eine Datenbank mit beliebigem Stand laufen und wendet nur die fehlenden
Migrationen an. Nach jeder neuen Migration neu erzeugen und einchecken.

## 2. Backup ziehen

Vor jedem Lauf gegen Produktion:

```bash
pg_dump -Fc -h localhost -U finanzen -d finanzen_db -f finanzen-$(date +%F).dump
```

## 3. Anwenden

```powershell
./Database/Apply-MigrationScript.ps1 -ConnectionString "postgresql://finanzen:PASSWORT@localhost:5432/finanzen_db"
```

Oder ohne PowerShell direkt auf dem Server:

```bash
psql --set ON_ERROR_STOP=on -d "postgresql://finanzen:PASSWORT@localhost:5432/finanzen_db" \
     -f migrations-idempotent.sql
```

`ON_ERROR_STOP` bricht beim ersten Fehler ab. Da jede Migration ihre eigene
Transaktion hat, bleiben bereits erfolgreich angewendete Migrationen erhalten —
nach dem Fehler kann das Skript nach der Korrektur einfach erneut laufen.

## Nur die neuen Migrationen ausgeben

Wenn ein Skript gewünscht ist, das nur ab einem bestimmten Stand aufsetzt:

```powershell
./Database/Generate-MigrationScript.ps1 -From 20260806142453_AddDebts -OutFile Database/nur-neue.sql
```

Den aktuellen Stand der Produktions-DB findet man mit:

```sql
SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY "MigrationId";
```

## Trockenlauf

Ein echter Dry-Run ist nicht möglich, weil das erzeugte Skript eigene
`START TRANSACTION`/`COMMIT`-Blöcke enthält. Zum Testen eine Kopie der
Produktionsdatenbank anlegen und das Skript dort ausführen:

```bash
createdb finanzen_test && pg_restore -d finanzen_test finanzen-2026-08-14.dump
```
