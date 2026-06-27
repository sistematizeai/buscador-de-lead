$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$PgBin = if ($env:POSTGRES_BIN) { $env:POSTGRES_BIN } else { "C:\Program Files\PostgreSQL\18\bin" }
$DataDir = Join-Path $Root ".local\postgres-data"
$PgCtl = Join-Path $PgBin "pg_ctl.exe"

if (!(Test-Path $DataDir)) {
  Write-Output "Local PostgreSQL data directory does not exist."
  exit 0
}

if (!(Test-Path $PgCtl)) {
  throw "pg_ctl.exe not found. Set POSTGRES_BIN to your PostgreSQL bin directory."
}

& $PgCtl -D $DataDir stop -m fast
