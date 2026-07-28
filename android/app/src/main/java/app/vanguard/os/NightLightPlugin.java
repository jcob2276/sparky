package app.vanguard.os;

import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.View;
import android.view.WindowManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NightLight")
public class NightLightPlugin extends Plugin {

    private static View systemOverlayView = null;
    private static WindowManager windowManager = null;

    @PluginMethod
    public void hasSecureSettingsPermission(PluginCall call) {
        Context context = getContext();
        boolean granted = false;
        try {
            int result = context.checkSelfPermission(android.Manifest.permission.WRITE_SECURE_SETTINGS);
            granted = (result == android.content.pm.PackageManager.PERMISSION_GRANTED);
            if (!granted) {
                int callingResult = context.checkCallingOrSelfPermission("android.permission.WRITE_SECURE_SETTINGS");
                granted = (callingResult == android.content.pm.PackageManager.PERMISSION_GRANTED);
            }
        } catch (Exception e) {
            granted = false;
        }
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void setSystemNightLight(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled", false);
        Context context = getContext();
        int val = Boolean.TRUE.equals(enabled) ? 1 : 0;
        boolean success = false;

        // 1. Stock Android / Pixel / Motorola Night Light
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                if (Settings.Secure.putInt(context.getContentResolver(), "night_display_activated", val)) {
                    success = true;
                }
            }
        } catch (Exception ignored) {}

        // 2. Xiaomi / POCO / Redmi (MIUI & HyperOS Reading / Paper Mode)
        try {
            if (Settings.System.putInt(context.getContentResolver(), "screen_paper_mode_enabled", val)) {
                success = true;
            }
            Settings.System.putInt(context.getContentResolver(), "reading_mode_enabled", val);
        } catch (Exception ignored) {}

        // 3. Samsung One UI (Blue Light Filter / Eye Comfort Shield)
        try {
            if (Settings.System.putInt(context.getContentResolver(), "blue_light_filter", val)) {
                success = true;
            }
        } catch (Exception ignored) {}

        // 4. Android UiModeManager
        try {
            android.app.UiModeManager uiModeManager = (android.app.UiModeManager) context.getSystemService(Context.UI_MODE_SERVICE);
            if (uiModeManager != null) {
                uiModeManager.setNightMode(enabled ? android.app.UiModeManager.MODE_NIGHT_YES : android.app.UiModeManager.MODE_NIGHT_NO);
            }
        } catch (Exception ignored) {}

        // 5. Fallback: If hardware keys couldn't be written directly, open native Night Light / Reading Mode settings page
        if (!success) {
            try {
                Intent intent = new Intent("android.settings.NIGHT_DISPLAY_SETTINGS");
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                success = true;
            } catch (Exception e1) {
                try {
                    Intent intent = new Intent(Settings.ACTION_DISPLAY_SETTINGS);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    success = true;
                } catch (Exception ignored) {}
            }
        }

        JSObject ret = new JSObject();
        ret.put("success", success);
        call.resolve(ret);
    }

    @PluginMethod
    public void hasOverlayPermission(PluginCall call) {
        Context context = getContext();
        boolean granted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            granted = Settings.canDrawOverlays(context);
        }
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + context.getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        }
        call.resolve();
    }

    /**
     * Red Moon / Twilight style System-Wide WindowManager Blue Light Overlay
     * Renders a warm amber/red filter over ALL apps across the entire Android system!
     */
    @PluginMethod
    public void setSystemOverlayFilter(final PluginCall call) {
        final Boolean enabled = call.getBoolean("enabled", false);
        final String hexColor = call.getString("color", "#FF8C00");
        final Double alphaVal = call.getDouble("alpha", 0.35);

        final Context context = getContext();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
            // Request permission if missing
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + context.getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);

            call.reject("Brak uprawnienia 'Wyświetlanie nad innymi aplikacjami'. Przyznaj uprawnienie w otwartym menu i spróbuj ponownie.");
            return;
        }

        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                try {
                    if (windowManager == null) {
                        windowManager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
                    }

                    if (Boolean.TRUE.equals(enabled)) {
                        if (systemOverlayView == null) {
                            systemOverlayView = new View(context);

                            int overlayType;
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                overlayType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
                            } else {
                                overlayType = WindowManager.LayoutParams.TYPE_PHONE;
                            }

                            WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                                WindowManager.LayoutParams.MATCH_PARENT,
                                WindowManager.LayoutParams.MATCH_PARENT,
                                overlayType,
                                WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                                    | WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                                    | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                                    | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
                                    | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
                                PixelFormat.TRANSLUCENT
                            );

                            int baseColor = Color.parseColor(hexColor);
                            int alphaByte = (int) Math.round(alphaVal * 255);
                            int overlayColor = Color.argb(alphaByte, Color.red(baseColor), Color.green(baseColor), Color.blue(baseColor));
                            systemOverlayView.setBackgroundColor(overlayColor);

                            windowManager.addView(systemOverlayView, params);
                        } else {
                            int baseColor = Color.parseColor(hexColor);
                            int alphaByte = (int) Math.round(alphaVal * 255);
                            int overlayColor = Color.argb(alphaByte, Color.red(baseColor), Color.green(baseColor), Color.blue(baseColor));
                            systemOverlayView.setBackgroundColor(overlayColor);
                        }
                    } else {
                        if (systemOverlayView != null && windowManager != null) {
                            windowManager.removeView(systemOverlayView);
                            systemOverlayView = null;
                        }
                    }

                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                } catch (Exception e) {
                    call.reject("Błąd nakładki systemowej: " + e.getMessage(), e);
                }
            }
        });
    }
}
