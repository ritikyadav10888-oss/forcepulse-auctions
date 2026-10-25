# Packs the project for the server. Run in PowerShell from the project folder:
#   powershell -ExecutionPolicy Bypass -File deploy\make-zip.ps1          first install: code + .env + database + photos
#   powershell -ExecutionPolicy Bypass -File deploy\make-zip.ps1 -Update  later updates: code only (server data is kept)
# The zip is written next to the project folder (on the Desktop).
param([switch]$Update)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$name = if ($Update) { 'forcepulse-update.zip' } else { 'forcepulse-full.zip' }
$out = Join-Path (Split-Path -Parent $root) $name

# Top-level folders and files left out: rebuilt on the server, or never needed there.
# Skipped by name here because tar's --exclude matches anywhere in a path ('uploads' would also drop app/api/uploads).
$skipTop = @('node_modules', '.next', '.git', 'data', 'backups', 'AUCTIONS', 'ypl', 'local-backup-20261022')
# Patterns tar may match anywhere
$exclude = @('*.zip', '*.tmp.mjs', '*.xlsx', '*.pdf')
if ($Update) {
  # Live data and secrets stay as they are on the server
  $skipTop += @('.env', 'uploads')
  $exclude += @('prisma/dev.db', 'prisma/*.db-journal')
}

if (Test-Path $out) { Remove-Item $out -Force -Confirm:$false }
$tarArgs = @('-a', '-c', '-f', $out)
foreach ($e in $exclude) { $tarArgs += "--exclude=$e" }
$tarArgs += @('-C', $root)
$tarArgs += Get-ChildItem -Force -LiteralPath $root | Where-Object { $skipTop -notcontains $_.Name } | ForEach-Object { $_.Name }
& tar.exe @tarArgs
if ($LASTEXITCODE -ne 0) { throw "tar failed with exit code $LASTEXITCODE" }

$size = [math]::Round((Get-Item $out).Length / 1MB, 1)
Write-Output "Created $out ($size MB)"
if (-not $Update) { Write-Output 'It contains your .env (passwords). Upload it only to your own server, and delete it afterwards.' }
