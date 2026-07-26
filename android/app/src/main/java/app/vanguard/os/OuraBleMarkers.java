package app.vanguard.os;

/** Oura base service UUID — detection only (noop/OURA_PROTOCOL.md). */
final class OuraBleMarkers {
    static final String SERVICE_UUID = "98ED0001-A541-11E4-B6A0-0002A5D5C51B";

    // Bluetooth SIG company identifier assigned to Oura Health Oy.
    static final int OURA_COMPANY_ID = 0x02B2;

    private OuraBleMarkers() {}

    static boolean isOuraLike(String name, java.util.List<android.os.ParcelUuid> serviceUuids) {
        return isOuraLike(name, serviceUuids, null);
    }

    static boolean isOuraLike(String name, java.util.List<android.os.ParcelUuid> serviceUuids,
                              android.util.SparseArray<byte[]> manufacturerData) {
        if (name != null) {
            if (isOuraName(name)) return true;
        }
        if (serviceUuids != null) {
            for (android.os.ParcelUuid uuid : serviceUuids) {
                if (uuid != null && SERVICE_UUID.equalsIgnoreCase(uuid.getUuid().toString())) {
                    return true;
                }
            }
        }
        if (manufacturerData != null) {
            for (int i = 0; i < manufacturerData.size(); i++) {
                if (isOuraManufacturer(manufacturerData.keyAt(i))) return true;
            }
        }
        return false;
    }

    static boolean isOuraManufacturer(int companyId) {
        return companyId == OURA_COMPANY_ID;
    }

    static boolean isOuraName(String name) {
        return name != null
            && name.toLowerCase(java.util.Locale.ROOT).contains("oura");
    }
}
