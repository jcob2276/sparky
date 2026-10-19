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

import androidx.core.content.ContextCompat;

import org.json.JSONObject;

/** Full-size list widget: a Zadania / Notatki switch, add button and a scrollable list. */
public class TasksWidgetProvider extends AppWidgetProvider {

    static final String ACTION_TAB = "app.vanguard.os.TASKS_TAB";
    static final String EXTRA_TAB = "tab";
    static final String TAB_TASKS = "tasks";
    static final String TAB_NOTES = "notes";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        render(context);
        refreshAsync(context, goAsync());
    }

    @Override
    public void onEnabled(Context context) {
        refreshAsync(context, null);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent != null && ACTION_TAB.equals(intent.getAction())) {
            FoodWidgetStore.saveTasksTab(context, TAB_NOTES.equals(intent.getStringExtra(EXTRA_TAB)) ? TAB_NOTES : TAB_TASKS);
            render(context);
            return;
        }
        super.onReceive(context, intent);
    }

    /** Repaints from the cached state and refreshes it from the backend in the background. */
    public static void updateAll(Context context) {
        render(context);
        refreshAsync(context, null);
    }

    static void refreshAsync(Context context, BroadcastReceiver.PendingResult pending) {
        final Context app = context.getApplicationContext();
        new Thread(() -> {
            try {
                if (FoodWidgetStore.hasCredentials(app)) {
                    JSONObject state = FoodWidgetApi.call(app, "widget-tasks", new JSONObject().put("action", "list"));
                    FoodWidgetStore.saveTasksState(app, state.toString());
                }
            } catch (Exception ignored) {
                // offline or expired: keep what is cached
            }
            render(app);
            if (pending != null) pending.finish();
        }).start();
    }

    /** Applies a server snapshot (returned by an add/complete call) and repaints. */
    static void applyState(Context context, JSONObject state) {
        if (state != null) FoodWidgetStore.saveTasksState(context, state.toString());
        render(context);
    }

    static void render(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, TasksWidgetProvider.class));
        if (ids.length == 0) return;
        for (int id : ids) manager.updateAppWidget(id, build(context, id));
        manager.notifyAppWidgetViewDataChanged(ids, R.id.tasks_list);
    }

    private static PendingIntent tabIntent(Context context, String tab, int code) {
        Intent intent = new Intent(context, TasksWidgetProvider.class).setAction(ACTION_TAB).putExtra(EXTRA_TAB, tab);
        intent.setData(Uri.parse("sparky://tasks-tab/" + tab));
        return PendingIntent.getBroadcast(context, code, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static String subtitle(JSONObject state, boolean tasksTab) {
        if (state == null) return "";
        JSONObject counts = state.optJSONObject("counts");
        if (counts == null) return "";
        if (!tasksTab) {
            int n = counts.optInt("notes");
            return n == 0 ? "" : n + (n == 1 ? " notatka" : " notatek");
        }
        int overdue = counts.optInt("overdue");
        int today = counts.optInt("today");
        int open = counts.optInt("open");
        StringBuilder out = new StringBuilder();
        if (overdue > 0) out.append(overdue).append(" po terminie · ");
        out.append(today).append(" na dziś · ").append(open).append(" otwartych");
        return out.toString();
    }

    private static RemoteViews build(Context context, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_tasks);
        boolean tasksTab = !TAB_NOTES.equals(FoodWidgetStore.tasksTab(context));
        JSONObject state = null;
        try {
            String raw = FoodWidgetStore.tasksState(context);
            if (raw != null) state = new JSONObject(raw);
        } catch (Exception ignored) {
            state = null;
        }

        int active = ContextCompat.getColor(context, R.color.widget_on_accent);
        int idle = ContextCompat.getColor(context, R.color.widget_muted);
        views.setInt(R.id.tasks_tab_todo, "setBackgroundResource", tasksTab ? R.drawable.widget_btn_primary : 0);
        views.setInt(R.id.tasks_tab_notes, "setBackgroundResource", tasksTab ? 0 : R.drawable.widget_btn_primary);
        views.setTextColor(R.id.tasks_tab_todo, tasksTab ? active : idle);
        views.setTextColor(R.id.tasks_tab_notes, tasksTab ? idle : active);
        views.setOnClickPendingIntent(R.id.tasks_tab_todo, tabIntent(context, TAB_TASKS, 51));
        views.setOnClickPendingIntent(R.id.tasks_tab_notes, tabIntent(context, TAB_NOTES, 52));

        Intent add = new Intent(context, QuickAddActivity.class)
            .putExtra(QuickAddActivity.EXTRA_TAB, tasksTab ? TAB_TASKS : TAB_NOTES)
            .setData(Uri.parse("sparky://tasks-add/" + (tasksTab ? TAB_TASKS : TAB_NOTES)))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        views.setOnClickPendingIntent(R.id.tasks_add, PendingIntent.getActivity(context, 53, add, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        String sub = !FoodWidgetStore.hasCredentials(context) ? "Otwórz aplikację, żeby połączyć widget" : subtitle(state, tasksTab);
        views.setTextViewText(R.id.tasks_subtitle, sub);

        Intent service = new Intent(context, TasksWidgetService.class);
        service.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        service.setData(Uri.parse(service.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.tasks_list, service);
        views.setEmptyView(R.id.tasks_list, R.id.tasks_empty);
        views.setTextViewText(R.id.tasks_empty, tasksTab ? "Wszystko zrobione. Dotknij +, żeby dodać zadanie." : "Brak notatek. Dotknij +, żeby dodać.");

        Intent template = new Intent(context, TasksActionActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        views.setPendingIntentTemplate(R.id.tasks_list,
            PendingIntent.getActivity(context, 54, template, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE));
        return views;
    }
}
