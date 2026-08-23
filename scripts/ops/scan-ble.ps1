$source = @"
using System;
using System.Threading;
using Windows.Devices.Bluetooth.Advertisement;

public class BleScanner {
    public static void Scan(int seconds) {
        var watcher = new BluetoothLEAdvertisementWatcher();
        watcher.ScanningMode = BluetoothLEScanningMode.Active;
        watcher.Received += (w, e) => {
            string name = e.Advertisement.LocalName;
            string addr = e.BluetoothAddress.ToString("X12");
            short rssi = e.RawSignalStrengthInDBm;
            Console.WriteLine(string.Format("BLE: [{0}] Name: '{1}' | Addr: {2} | RSSI: {3} dBm", DateTime.Now.ToString("HH:mm:ss"), name, addr, rssi));
        };
        watcher.Start();
        Thread.Sleep(seconds * 1000);
        watcher.Stop();
    }
}
"@

Add-Type -TypeDefinition $source -Language CSharp -ReferencedAssemblies "System.Runtime.InteropServices.WindowsRuntime.dll", "C:\Windows\System32\WinMetadata\Windows.Devices.Bluetooth.winmd", "C:\Windows\System32\WinMetadata\Windows.Foundation.winmd"

[BleScanner]::Scan(4)
