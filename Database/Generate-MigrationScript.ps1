<#
.SYNOPSIS
    Erzeugt aus den EF-Core-Migrationen ein idempotentes SQL-Skript für die produktive Datenbank.

.DESCRIPTION
    Das erzeugte Skript (Database/migrations-idempotent.sql) prüft für jede Migration
    einzeln, ob sie in "__EFMigrationsHistory" schon eingetragen ist, und überspringt
    sie in dem Fall. Es kann daher gefahrlos auf einer Datenbank mit beliebigem
    Migrationsstand ausgeführt werden — es werden immer nur die fehlenden angewendet.

    Nach jeder neuen Migration dieses Skript erneut ausführen und die erzeugte
    .sql-Datei einchecken.

.PARAMETER From
    Optional: Migration, ab der das Skript erzeugt wird (Standard: alle, ab 0).
    Beispiel: -From 20260806142453_AddDebts

.PARAMETER OutFile
    Zielpfad der SQL-Datei (Standard: Database/migrations-idempotent.sql).

.EXAMPLE
    ./Database/Generate-MigrationScript.ps1

.EXAMPLE
    ./Database/Generate-MigrationScript.ps1 -From 20260806142453_AddDebts -OutFile Database/nur-neue.sql
#>
[CmdletBinding()]
param(
    [string]$From = '0',
    [string]$OutFile
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $OutFile) { $OutFile = Join-Path $repoRoot 'Database\migrations-idempotent.sql' }

$dataAccess = Join-Path $repoRoot 'Source\Backend\Backend.DataAccess\Backend.DataAccess.csproj'
$startup    = Join-Path $repoRoot 'Source\Backend\Backend.API\Backend.API.csproj'

Push-Location $repoRoot
try {
    Write-Host 'Stelle dotnet-ef bereit...' -ForegroundColor Cyan
    dotnet tool restore
    if ($LASTEXITCODE -ne 0) { throw "dotnet tool restore fehlgeschlagen (Exit $LASTEXITCODE)." }

    Write-Host "Erzeuge idempotentes SQL-Skript ab '$From' ..." -ForegroundColor Cyan
    dotnet ef migrations script $From `
        --idempotent `
        --project $dataAccess `
        --startup-project $startup `
        --output $OutFile
    if ($LASTEXITCODE -ne 0) { throw "dotnet ef migrations script fehlgeschlagen (Exit $LASTEXITCODE)." }

    Write-Host "Fertig: $OutFile" -ForegroundColor Green
}
finally {
    Pop-Location
}
