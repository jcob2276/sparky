<#
Zapisuje na sparky-vps hasło do bazy Supabase (tylko na maszynie, w /etc/sparky-backup.env, chmod 600)
i od razu robi pierwszy backup. Hasło wpisujesz w okienku (ukryte) - nie trafia do repo ani do czatu.
Uzycie:  pwsh scripts/ops/vps-set-db-password.ps1 [-Ip 100.100.25.95]
Hasło: Supabase -> Project Settings -> Database -> "Reset database password" (jeśli nie pamiętasz).
#>
param(
  [string]$Ip = '100.100.25.95',
  [string]$Key = "$HOME\.ssh\oci_sparky",
  [string]$ProjectRef = 'pdvqkgfsqziqlhptatgf',
  [string]$PoolerHost = 'aws-0-eu-west-1.pooler.supabase.com'
)
$sec = Read-Host 'Haslo do bazy Supabase (wpisz i Enter)' -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
if (-not $plain) { throw 'Puste haslo' }
$enc = [Uri]::EscapeDataString($plain)
$url = "postgresql://postgres.${ProjectRef}:${enc}@${PoolerHost}:5432/postgres"
"DATABASE_URL=$url`n" | ssh -i $Key ubuntu@$Ip "sudo tee /etc/sparky-backup.env >/dev/null && sudo sed -i '1s/^\xEF\xBB\xBF//; s/\r$//' /etc/sparky-backup.env && sudo chmod 600 /etc/sparky-backup.env && sudo chown root:root /etc/sparky-backup.env"
Remove-Variable plain, enc, url, sec
"Zapisano. Pierwszy backup:"
ssh -i $Key ubuntu@$Ip "sudo systemctl start sparky-backup.service; sudo journalctl -u sparky-backup.service -n 8 --no-pager"



