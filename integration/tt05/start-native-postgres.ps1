# New local cluster using installed binaries; preserves all existing services and data.
param([string]$PostgresBin = 'C:/Program Files/PostgreSQL/18/bin')
$ErrorActionPreference = 'Stop'
$mobileRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$state = Join-Path $mobileRoot 'reports/tt05-local'
$data = Join-Path $state 'postgres-data'
if (Test-Path -LiteralPath $data) { throw 'A test cluster already exists. Preserve it; inspect before restarting manually.' }
if (Get-NetTCPConnection -LocalPort 55439 -State Listen -ErrorAction SilentlyContinue) { throw 'Port 55439 is occupied. No process was changed.' }
New-Item -ItemType Directory -Force -Path $state | Out-Null
$bootstrap = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$passFile = Join-Path $state '.bootstrap-password'
[IO.File]::WriteAllText($passFile, $bootstrap)
& (Join-Path $PostgresBin 'initdb.exe') -D $data -U tt05_bootstrap -A scram-sha-256 --pwfile=$passFile -E UTF8 --locale=C
if ($LASTEXITCODE -ne 0) { throw 'Isolated initdb failed. Existing clusters were not touched.' }
[IO.File]::WriteAllText((Join-Path $state 'TT05_ISOLATED'), $data)
& (Join-Path $PostgresBin 'pg_ctl.exe') -D $data -l (Join-Path $state 'postgres.log') -o '-p 55439 -h 127.0.0.1' -w start
if ($LASTEXITCODE -ne 0) { throw 'Isolated PostgreSQL startup failed.' }
$previous = $env:PGPASSWORD
try {
  $env:PGPASSWORD = $bootstrap
  $sql = @"
CREATE ROLE auth_test LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD 'synthetic-test-only';
CREATE ROLE spring_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
GRANT pg_monitor TO auth_test WITH ADMIN OPTION;
CREATE DATABASE backend_hardening_test OWNER auth_test;
"@
  $sql | & (Join-Path $PostgresBin 'psql.exe') -h 127.0.0.1 -p 55439 -U tt05_bootstrap -d postgres -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) { throw 'Isolated role/database setup failed.' }
} finally { $env:PGPASSWORD = $previous }
Write-Output 'TT05 isolated PostgreSQL ready on 127.0.0.1:55439. No production/service database was accessed.'
