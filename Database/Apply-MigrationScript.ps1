<#
.SYNOPSIS
    Wendet das idempotente Migrations-SQL-Skript auf eine Datenbank an (per psql).

.DESCRIPTION
    Führt Database/migrations-idempotent.sql gegen die angegebene PostgreSQL-Datenbank
    aus. Das Skript ist idempotent: bereits angewendete Migrationen werden übersprungen.
    Bei einem Fehler bricht psql ab (ON_ERROR_STOP) — jede Migration läuft in einer
    eigenen Transaktion, bereits erfolgreiche Migrationen bleiben also erhalten.

    VOR DEM AUSFÜHREN AUF PRODUKTION: Backup ziehen!
        pg_dump -Fc -h <host> -U <user> -d finanzen_db -f backup.dump

.PARAMETER ConnectionString
    PostgreSQL-Verbindung als libpq-URI, z. B.
    postgresql://finanzen:PASSWORT@localhost:5432/finanzen_db
    Alternativ Umgebungsvariable FINANZEN_DB_URL setzen.

.PARAMETER ScriptFile
    SQL-Datei (Standard: Database/migrations-idempotent.sql).

.NOTES
    Ein Trockenlauf ist nicht möglich: Das erzeugte Skript klammert jede Migration
    selbst in START TRANSACTION/COMMIT. Zum Testen eine Kopie der Produktions-DB
    anlegen (pg_dump/pg_restore) und das Skript dort ausführen.

.EXAMPLE
    ./Database/Apply-MigrationScript.ps1 -ConnectionString "postgresql://finanzen:geheim@localhost:5432/finanzen_db"
#>
[CmdletBinding()]
param(
    [string]$ConnectionString = $env:FINANZEN_DB_URL,
    [string]$ScriptFile
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $ScriptFile) { $ScriptFile = Join-Path $repoRoot 'Database\migrations-idempotent.sql' }

if (-not $ConnectionString) {
    throw 'Keine Verbindung angegeben. -ConnectionString setzen oder Umgebungsvariable FINANZEN_DB_URL befüllen.'
}
if (-not (Test-Path $ScriptFile)) {
    throw "SQL-Datei nicht gefunden: $ScriptFile. Zuerst Generate-MigrationScript.ps1 ausführen."
}
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    throw 'psql wurde nicht gefunden. PostgreSQL-Client installieren oder das SQL-Skript manuell einspielen.'
}

# Passwort nicht mit ausgeben
$safe = $ConnectionString -replace '://([^:/@]+):[^@]*@', '://$1:***@'
Write-Host "Ziel-Datenbank: $safe" -ForegroundColor Cyan
Write-Host "Skript:         $ScriptFile" -ForegroundColor Cyan

psql --set ON_ERROR_STOP=on --dbname $ConnectionString --file $ScriptFile
if ($LASTEXITCODE -ne 0) { throw "psql fehlgeschlagen (Exit $LASTEXITCODE). Datenbank prüfen." }

Write-Host 'Migrationen erfolgreich angewendet.' -ForegroundColor Green
