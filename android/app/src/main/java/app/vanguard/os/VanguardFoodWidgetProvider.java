package app.vanguard.os;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONObject;

/** 4×2 card: today's kcal and protein plus one-tap capture buttons. */
public class VanguardFoodWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        renderAll(context, manager, appWidgetIds, FoodWidgetStore.state(context), false);
        refreshAsync(context, goAsync());
    }

    @Override
    public void onEnabled(Context context) {
        refreshAsync(context, null);
    }

    public static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, VanguardFoodWidgetProvider.class));
        renderAll(context, manager, ids, FoodWidgetStore.state(context), false);
        refreshAsync(context, null);
    }

    /** Re-reads today's totals from the backend, then repaints every card. */
    static void refreshAsync(Context context, BroadcastReceiver.PendingResult pending) {
        final Context app = context.getApplicationContext();
        new Thread(() -> {
            boolean needsReconnect = false;
            try {
                if (FoodWidgetStore.hasCredentials(app)) {
                    FoodWidgetApi.refreshState(app);
                } else {
                    needsReconnect = true;
                }
            } catch (FoodWidgetApi.ApiException e) {
                needsReconnect = e.status == 401;
            } catch (Exception ignored) {
                // offline: keep the last known numbers
            }
            AppWidgetManager manager = AppWidgetManager.getInstance(app);
            int[] ids = manager.getAppWidgetIds(new ComponentName(app, VanguardFoodWidgetProvider.class));
            renderAll(app, manager, ids, FoodWidgetStore.state(app), needsReconnect);
            if (pending != null) pending.finish();
        }).start();
    }

    private static void renderAll(Context context, AppWidgetManager manager, int[] ids, String stateJson, boolean needsReconnect) {
        JSONObject state = null;
        try {
            if (stateJson != null) state = new JSONObject(stateJson);
        } catch (Exception ignored) {
            state = null;
        }
        for (int id : ids) {
            manager.updateAppWidget(id, buildViews(context, state, needsReconnect));
        }
    }

    private static String mealLabel(String type) {
        if ("breakfast".equals(type)) return "Śniadanie";
        if ("lunch".equals(type)) return "Obiad";
        if ("dinner".equals(type)) return "Kolacja";
        return "Przekąska";
    }

    private static RemoteViews buildViews(Context context, JSONObject state, boolean needsReconnect) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_food);
        views.setOnClickPendingIntent(R.id.widget_btn_photo, FoodWidgetIntents.capture(context, FoodWidgetIntents.MODE_PHOTO, 11));
        views.setOnClickPendingIntent(R.id.widget_btn_scan, FoodWidgetIntents.capture(context, FoodWidgetIntents.MODE_SCAN, 12));
        views.setOnClickPendingIntent(R.id.widget_btn_text, FoodWidgetIntents.capture(context, FoodWidgetIntents.MODE_TEXT, 13));
        views.setOnClickPendingIntent(R.id.widget_food_title, FoodWidgetIntents.openApp(context, 15));
        views.setOnClickPendingIntent(R.id.widget_food_kcal, FoodWidgetIntents.openApp(context, 15));

        if (state == null) {
            views.setTextViewText(R.id.widget_food_kcal, needsReconnect ? "Otwórz aplikację, by połączyć" : "Ładuję…");
            views.setTextViewText(R.id.widget_food_macros, "");
            views.setTextViewText(R.id.widget_food_meal, "");
            views.setProgressBar(R.id.widget_food_progress, 100, 0, false);
            return views;
        }

        int kcal = state.optInt("kcal", 0);
        int target = state.optInt("kcalTarget", 0);
        views.setTextViewText(R.id.widget_food_meal, mealLabel(state.optString("mealType")));
        views.setTextViewText(R.id.widget_food_kcal, target > 0 ? kcal + " / " + target + " kcal" : kcal + " kcal");
        views.setProgressBar(R.id.widget_food_progress, 100, target > 0 ? Math.min(100, kcal * 100 / target) : 0, false);
        int proteinTarget = state.optInt("proteinTarget", 0);
        String protein = "Białko " + state.optInt("protein", 0) + (proteinTarget > 0 ? " / " + proteinTarget : "") + " g";
        views.setTextViewText(R.id.widget_food_macros, protein);

        return views;
    }
}
