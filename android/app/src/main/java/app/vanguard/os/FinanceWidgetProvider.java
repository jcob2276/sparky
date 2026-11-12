package app.vanguard.os;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.NumberFormat;
import java.util.Locale;

/** Finance widget: bank balance, this month's spending and the most important alert. Tap opens Finanse. */
public class FinanceWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        render(context);
        refreshAsync(context, goAsync());
    }

    @Override
    public void onEnabled(Context context) {
        refreshAsync(context, null);
    }

    /** Repaints from the cached summary and refreshes it from the backend in the background. */
    public static void updateAll(Context context) {
        render(context);
        refreshAsync(context, null);
    }

    static void refreshAsync(Context context, BroadcastReceiver.PendingResult pending) {
        final Context app = context.getApplicationContext();
        new Thread(() -> {
            try {
                if (FoodWidgetStore.hasCredentials(app)) {
                    JSONObject state = FoodWidgetApi.call(app, "widget-finance", new JSONObject().put("action", "summary"));
                    FoodWidgetStore.saveFinanceState(app, state.toString());
                }
            } catch (Exception ignored) {
                // offline or expired: keep what is cached
            }
            render(app);
            if (pending != null) pending.finish();
        }).start();
    }

    private static String pln(double value) {
        NumberFormat format = NumberFormat.getIntegerInstance(new Locale("pl", "PL"));
        return format.format(Math.round(value)) + " zł";
    }

    static void render(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, FinanceWidgetProvider.class));
        for (int id : ids) manager.updateAppWidget(id, build(context, id));
    }

    private static RemoteViews build(Context context, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_finance);
        JSONObject state = null;
        try {
            String raw = FoodWidgetStore.financeState(context);
            if (raw != null) state = new JSONObject(raw);
        } catch (Exception ignored) {
            state = null;
        }

        String balance = "—";
        String detail = FoodWidgetStore.hasCredentials(context) ? "Wczytuję dane…" : "Otwórz aplikację, żeby połączyć widget";
        String alert = "";
        if (state != null && state.optBoolean("connected")) {
            balance = pln(state.optDouble("balance"));
            detail = "Wydane w tym miesiącu: " + pln(state.optDouble("spent"));
            JSONArray alerts = state.optJSONArray("alerts");
            if (alerts != null && alerts.length() > 0) {
                JSONObject first = alerts.optJSONObject(0);
                if (first != null) alert = first.optString("text");
            }
        } else if (state != null) {
            detail = "Połącz bank w aplikacji";
        }
        views.setTextViewText(R.id.finance_balance, balance);
        views.setTextViewText(R.id.finance_detail, detail);
        views.setTextViewText(R.id.finance_alert, alert);
        views.setViewVisibility(R.id.finance_alert, alert.isEmpty() ? android.view.View.GONE : android.view.View.VISIBLE);

        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse("https://localhost/finanse"));
        open.setPackage(context.getPackageName());
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        views.setOnClickPendingIntent(R.id.finance_root, PendingIntent.getActivity(
            context, appWidgetId * 10 + 3, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        return views;
    }
}
