<#
Tworzy darmowego VPS-a Oracle Always Free (A1.Flex, 2 OCPU / 12 GB / 200 GB, Ubuntu ARM)
w regionie domowym i ponawia prĂłby przy "Out of host capacity".

Wymaga: OCI CLI (`pip install oci-cli`) i skonfigurowanego ~/.oci/config (`oci setup config`).
UĹĽycie:  pwsh scripts/ops/oci-create-free-vps.ps1 [-Name sparky-vps] [-RetrySeconds 60]
#>
param(
  [string]$Name = 'sparky-vps',
  [int]$Ocpus = 2,
  [int]$MemoryGb = 12,
  [int]$BootGb = 200,
  [int]$RetrySeconds = 60,
  [string]$SshKeyPath = "$HOME\.ssh\oci_sparky"
)
$ErrorActionPreference = 'Continue'
$shape = 'VM.Standard.A1.Flex'

function Invoke-Oci { $e = [IO.Path]::GetTempFileName(); $out = & oci.exe @args 2>$e; $err = Get-Content $e -Raw; Remove-Item $e; if ($LASTEXITCODE -ne 0) { throw ("$err" + ($out -join "`n")) }; ($out -join "`n") | ConvertFrom-Json }

# Tenancy (compartment root) z konfiguracji
$cfg = Get-Content "$HOME\.oci\config" -Raw
$tenancy = ([regex]::Match($cfg, 'tenancy\s*=\s*(\S+)')).Groups[1].Value
if (-not $tenancy) { throw 'Brak tenancy w ~/.oci/config - uruchom: oci setup config' }

# Klucz SSH
if (-not (Test-Path $SshKeyPath)) { ssh-keygen -t ed25519 -f $SshKeyPath -N '""' -C $Name | Out-Null }
$pub = "$SshKeyPath.pub"

# SieÄ‡ (idempotentnie po nazwie)
$vcn = (Invoke-Oci network vcn list --compartment-id $tenancy --display-name "$Name-vcn" --lifecycle-state AVAILABLE).data | Select-Object -First 1
if (-not $vcn) {
  $vcn = (Invoke-Oci network vcn create --compartment-id $tenancy --display-name "$Name-vcn" --cidr-block 10.0.0.0/16 --wait-for-state AVAILABLE).data
  $igw = (Invoke-Oci network internet-gateway create --compartment-id $tenancy --vcn-id $vcn.id --is-enabled true --display-name "$Name-igw" --wait-for-state AVAILABLE).data
  $rules = '[{"destination":"0.0.0.0/0","destinationType":"CIDR_BLOCK","networkEntityId":"' + $igw.id + '"}]'
  $rf = New-TemporaryFile; Set-Content $rf $rules
  Invoke-Oci network route-table update --rt-id $vcn.'default-route-table-id' --route-rules "file://$rf" --force | Out-Null
  $ing = @(22, 80, 443) | ForEach-Object { '{"source":"0.0.0.0/0","protocol":"6","tcpOptions":{"destinationPortRange":{"min":' + $_ + ',"max":' + $_ + '}}}' }
  $sf = New-TemporaryFile; Set-Content $sf ('[' + ($ing -join ',') + ']')
  $egf = New-TemporaryFile; Set-Content $egf '[{"destination":"0.0.0.0/0","protocol":"all"}]'
  Invoke-Oci network security-list update --security-list-id $vcn.'default-security-list-id' --ingress-security-rules "file://$sf" --egress-security-rules "file://$egf" --force | Out-Null
}
$subnet = (Invoke-Oci network subnet list --compartment-id $tenancy --vcn-id $vcn.id --lifecycle-state AVAILABLE).data | Select-Object -First 1
if (-not $subnet) {
  $subnet = (Invoke-Oci network subnet create --compartment-id $tenancy --vcn-id $vcn.id --cidr-block 10.0.0.0/24 --display-name "$Name-subnet" --wait-for-state AVAILABLE).data
}

# Obraz Ubuntu ARM (najnowszy LTS)
$image = (Invoke-Oci compute image list --compartment-id $tenancy --operating-system 'Canonical Ubuntu' --shape $shape --sort-by TIMECREATED --sort-order DESC --limit 20).data |
  Where-Object { $_.'operating-system-version' -match '^(22|24)\.04$' } | Select-Object -First 1
if (-not $image) { throw 'Nie znaleziono obrazu Ubuntu dla A1' }
Write-Host "Obraz: $($image.'display-name')"

$ads = (Invoke-Oci iam availability-domain list --compartment-id $tenancy).data
$shapeFile = [IO.Path]::GetTempFileName()
[IO.File]::WriteAllText($shapeFile, ('{"ocpus":' + $Ocpus + ',"memoryInGBs":' + $MemoryGb + '}'))
$shapeCfg = 'file://' + ($shapeFile -replace '\\', '/')

$attempt = 0
while ($true) {
  foreach ($ad in $ads) {
    $attempt++
    Write-Host "[$attempt] PrĂłba w $($ad.name)..."
    $errf = [IO.Path]::GetTempFileName()
    $out = & oci.exe compute instance launch --compartment-id $tenancy --availability-domain $ad.name `
      --shape $shape --shape-config $shapeCfg --display-name $Name --image-id $image.id `
      --subnet-id $subnet.id --assign-public-ip true --boot-volume-size-in-gbs $BootGb `
      --ssh-authorized-keys-file $pub --wait-for-state RUNNING 2>$errf
    if ($LASTEXITCODE -eq 0) {
      $inst = (($out -join "`n") | ConvertFrom-Json).data
      $vnic = (Invoke-Oci compute instance list-vnics --instance-id $inst.id).data | Select-Object -First 1
      Write-Host "GOTOWE. IP: $($vnic.'public-ip')"
      Write-Host "SSH: ssh -i $SshKeyPath ubuntu@$($vnic.'public-ip')"
      exit 0
    }
    $txt = ((Get-Content $errf -Raw) + ($out -join "`n")); Remove-Item $errf
    if ($txt -notmatch 'Out of host capacity|InternalError|TooManyRequests|LimitExceeded') { throw $txt }
    Write-Host '  brak miejsca, nastÄ™pna domena'
  }
  Start-Sleep -Seconds $RetrySeconds
}



