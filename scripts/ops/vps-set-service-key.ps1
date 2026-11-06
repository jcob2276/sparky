<#
Dopisuje na sparky-vps (do /etc/sparky-backup.env, chmod 600) klucz service_role Supabase,
zeby nocna kopia plikow mogla pobierac buckety. Klucz wpisujesz w okienku (ukryte),
nie trafia do repo ani do czatu.
Klucz: Supabase -> Project Settings -> API -> "service_role" (secret).
Uzycie:  pwsh scripts/ops/vps-set-service-key.ps1 [-Ip 100.100.25.95]
#>
param(
  [string]$Ip = '100.100.25.95',
  [string]$Key = "$HOME\.ssh\oci_sparky",
  [string]$SupabaseUrl = 'https://pdvqkgfsqziqlhptatgf.supabase.co'
)
$sec = Read-Host 'Klucz service_role Supabase (wpisz i Enter)' -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
if (-not $plain) { throw 'Pusty klucz' }
$lines = "`nSUPABASE_URL=$SupabaseUrl`nSUPABASE_SERVICE_ROLE_KEY=$plain`n"
$lines | ssh -i $Key ubuntu@$Ip "sudo sed -i '/^SUPABASE_URL=/d;/^SUPABASE_SERVICE_ROLE_KEY=/d' /etc/sparky-backup.env && sudo tee -a /etc/sparky-backup.env >/dev/null && sudo sed -i '1s/^\xEF\xBB\xBF//; s/\r$//; /^$/d' /etc/sparky-backup.env && sudo chmod 600 /etc/sparky-backup.env"
Remove-Variable plain, lines, sec
"Zapisano. Probny przebieg:"
ssh -i $Key ubuntu@$Ip "sudo systemctl start sparky-backup-files.service; sudo journalctl -u sparky-backup-files.service -n 10 --no-pager"
