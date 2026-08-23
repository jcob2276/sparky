Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Devices.Enumeration.DeviceInformation, Windows.Devices.Enumeration, ContentType = WindowsRuntime] | Out-Null
[Windows.Devices.Bluetooth.BluetoothLEDevice, Windows.Devices.Bluetooth, ContentType = WindowsRuntime] | Out-Null

$selector = [Windows.Devices.Bluetooth.BluetoothLEDevice]::GetDeviceSelector()
$op = [Windows.Devices.Enumeration.DeviceInformation]::FindAllAsync($selector)

$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' 
} | Select-Object -First 1

$task = $asTaskGeneric.MakeGenericMethod([Windows.Devices.Enumeration.DeviceInformationCollection]).Invoke($null, @($op))
$task.Wait(4000) | Out-Null
$devices = $task.Result

Write-Host "Znalezione urzadzenia BLE:"
$devices | Select-Object Name, Id, IsEnabled | Format-Table -AutoSize
