package app.vanguard.os;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    private static WidgetBridgePlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (instance == this) {
            instance = null;
        }
        super.handleOnDestroy();
    }

    static void notifyDemoStateChanged(JSObject state) {
        WidgetBridgePlugin plugin = instance;
        if (plugin == null) return;
        plugin.notifyListeners("demoStateChanged", state);
    }

    @PluginMethod
    public void getFoodWidgetStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("userId", FoodWidgetStore.userId(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void setFoodWidgetCredentials(PluginCall call) {
        String baseUrl = call.getString("baseUrl");
        String userId = call.getString("userId");
        String token = call.getString("token");
        if (baseUrl == null || userId == null || token == null) {
            call.reject("MISSING_CREDENTIALS");
            return;
        }
        FoodWidgetStore.saveCredentials(getContext(), baseUrl, userId, token);
        call.resolve();
    }

    @PluginMethod
    public void refreshFoodWidgets(PluginCall call) {
        VanguardFoodWidgetProvider.updateAll(getContext());
        TasksWidgetProvider.updateAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void getDemoState(PluginCall call) {
        call.resolve(WidgetStateStore.readState(getContext()));
    }

    @PluginMethod
    public void cycleDemoMode(PluginCall call) {
        JSObject state = WidgetStateStore.cycleMode(getContext(), false);
        VanguardFoodWidgetProvider.updateAll(getContext());
        notifyDemoStateChanged(state);
        call.resolve(state);
    }

    @PluginMethod
    public void refreshDemoWidget(PluginCall call) {
        VanguardFoodWidgetProvider.updateAll(getContext());
        call.resolve(WidgetStateStore.readState(getContext()));
    }

    @PluginMethod
    public void requestPinTasksWidget(PluginCall call) {
        Context context = getContext();
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || !manager.isRequestPinAppWidgetSupported()) {
            call.reject("PIN_WIDGET_NOT_SUPPORTED");
            return;
        }
        manager.requestPinAppWidget(new ComponentName(context, TasksWidgetProvider.class), null, null);
        call.resolve();
    }

    @PluginMethod
    public void requestPinDemoWidget(PluginCall call) {
        Context context = getContext();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.reject("PIN_WIDGET_REQUIRES_OREO");
            return;
        }
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        if (!manager.isRequestPinAppWidgetSupported()) {
            call.reject("PIN_WIDGET_NOT_SUPPORTED");
            return;
        }
        ComponentName provider = new ComponentName(context, VanguardFoodWidgetProvider.class);
        Intent success = new Intent(context, MainActivity.class);
        success.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        android.app.PendingIntent callback = android.app.PendingIntent.getActivity(
            context,
            9102,
            success,
            android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE
        );
        manager.requestPinAppWidget(provider, null, callback);
        call.resolve();
    }
}
