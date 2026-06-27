$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$PgBin = if ($env:POSTGRES_BIN) { $env:POSTGRES_BIN } else { "C:\Program Files\PostgreSQL\18\bin" }
$Port = if ($env:PROSPEX_POSTGRES_PORT) { [int]$env:PROSPEX_POSTGRES_PORT } else { 55032 }
$User = "prospex"
$Database = "prospex"
$Password = if ($env:PROSPEX_POSTGRES_PASSWORD) { $env:PROSPEX_POSTGRES_PASSWORD } else { "prospex_gosom_local_2026" }
$LocalDir = Join-Path $Root ".local"
$DataDir = Join-Path $LocalDir "postgres-data"
$LogFile = Join-Path $LocalDir "postgres.log"

$InitDb = Join-Path $PgBin "initdb.exe"
$PgCtl = Join-Path $PgBin "pg_ctl.exe"
$PgIsReady = Join-Path $PgBin "pg_isready.exe"
$Psql = Join-Path $PgBin "psql.exe"

if (!(Test-Path $InitDb) -or !(Test-Path $PgCtl) -or !(Test-Path $PgIsReady) -or !(Test-Path $Psql)) {
  throw "PostgreSQL binaries not found. Set POSTGRES_BIN to the directory containing initdb.exe, pg_ctl.exe, pg_isready.exe, and psql.exe."
}

New-Item -ItemType Directory -Force -Path $LocalDir | Out-Null

if (!(Test-Path $DataDir)) {
  $PwFile = Join-Path $LocalDir "pgpass.tmp"
  Set-Content -Path $PwFile -Value $Password -NoNewline -Encoding ASCII
  try {
    & $InitDb -D $DataDir -U $User --encoding=UTF8 --auth-host=scram-sha-256 --auth-local=trust --pwfile=$PwFile
  } finally {
    Remove-Item -Force $PwFile -ErrorAction SilentlyContinue
  }
}

& $PgIsReady -h localhost -p $Port -U $User | Out-Null
if ($LASTEXITCODE -ne 0) {
  & $PgCtl -D $DataDir -o "`"-p $Port`"" -l $LogFile start | Out-Null
}

for ($i = 0; $i -lt 30; $i++) {
  & $PgIsReady -h localhost -p $Port -U $User | Out-Null
  if ($LASTEXITCODE -eq 0) { break }
  Start-Sleep -Seconds 1
}

if ($LASTEXITCODE -ne 0) {
  throw "Local PostgreSQL did not become ready on port $Port."
}

$env:PGPASSWORD = $Password
$Exists = & $Psql -h localhost -p $Port -U $User -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$Database';"
if (($Exists | Out-String).Trim() -ne "1") {
  & (Join-Path $PgBin "createdb.exe") -h localhost -p $Port -U $User $Database
}

Write-Output "Local PostgreSQL ready: postgresql://${User}:***@localhost:${Port}/${Database}"
