# Wywołanie Codex CLI z Claude: stałe flagi + twardy timeout (bez tego workspace-write na Windows potrafi zawisnąć).
# Użycie: pwsh scripts/ops/codex-bridge.ps1 -Prompt "..." [-Write] [-TimeoutSec 120]
param(
  [Parameter(Mandatory)][string]$Prompt,
  [switch]$Write,
  [int]$TimeoutSec = 120
)
$sandbox = if ($Write) { 'workspace-write' } else { 'read-only' }
$tmp = New-TemporaryFile
$err = New-TemporaryFile
$codex = Join-Path $env:APPDATA 'npm\codex.cmd'
$p = Start-Process -FilePath $codex -NoNewWindow -PassThru `
  -ArgumentList 'exec', '-c', 'windows.sandbox="unelevated"', '--sandbox', $sandbox, ('"' + $Prompt.Replace('"', "'") + '"') `
  -RedirectStandardOutput $tmp -RedirectStandardError $err
if (-not $p.WaitForExit($TimeoutSec * 1000)) {
  Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $p.Id } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
  Remove-Item $tmp, $err -ErrorAction SilentlyContinue
  Write-Error "codex-bridge: timeout po ${TimeoutSec}s"; exit 124
}
$out = Get-Content $tmp -Raw
Remove-Item $tmp, $err -ErrorAction SilentlyContinue
$out
