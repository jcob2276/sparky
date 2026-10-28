# Wywołanie Codex CLI z Claude: stałe flagi + twardy timeout (bez tego workspace-write na Windows potrafi zawisnąć).
# Prompt idzie przez stdin (plik tymczasowy), więc znaki specjalne (<, >, &, %, cudzysłowy) nie psują wywołania.
# Użycie: pwsh scripts/ops/codex-bridge.ps1 -Prompt "..." [-Write] [-TimeoutSec 120]
param(
  [Parameter(Mandatory)][string]$Prompt,
  [switch]$Write,
  [int]$TimeoutSec = 120
)
$sandbox = if ($Write) { 'workspace-write' } else { 'read-only' }
$in = New-TemporaryFile
$tmp = New-TemporaryFile
$err = New-TemporaryFile
[System.IO.File]::WriteAllText($in.FullName, $Prompt, (New-Object System.Text.UTF8Encoding($false)))
$codex = Join-Path $env:APPDATA 'npm\codex.cmd'
$p = Start-Process -FilePath $codex -NoNewWindow -PassThru `
  -ArgumentList 'exec', '-c', 'windows.sandbox="unelevated"', '--sandbox', $sandbox, '-' `
  -RedirectStandardInput $in -RedirectStandardOutput $tmp -RedirectStandardError $err
if (-not $p.WaitForExit($TimeoutSec * 1000)) {
  Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $p.Id } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
  Remove-Item $in, $tmp, $err -ErrorAction SilentlyContinue
  Write-Error "codex-bridge: timeout po ${TimeoutSec}s"; exit 124
}
$out = Get-Content $tmp -Raw
if ([string]::IsNullOrWhiteSpace($out)) {
  Write-Error ("codex-bridge: pusty wynik (kod wyjscia $($p.ExitCode)). stderr: " + ((Get-Content $err -Raw) -replace '\s+', ' ').Trim())
  Remove-Item $in, $tmp, $err -ErrorAction SilentlyContinue
  exit 1
}
Remove-Item $in, $tmp, $err -ErrorAction SilentlyContinue
$out
