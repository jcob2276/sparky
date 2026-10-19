package app.vanguard.os;

import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

/** Feeds the scrollable list of the Zadania / Notatki widget from the cached backend snapshot. */
public class TasksWidgetService extends RemoteViewsService {

    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new Factory(getApplicationContext());
    }

    private static final class Factory implements RemoteViewsFactory {
        private final Context context;
        private boolean tasksTab = true;
        private String today = "";
        private final List<JSONObject> rows = new ArrayList<>();

        Factory(Context context) {
            this.context = context;
        }

        @Override public void onCreate() {}

        @Override
        public void onDataSetChanged() {
            rows.clear();
            tasksTab = !TasksWidgetProvider.TAB_NOTES.equals(FoodWidgetStore.tasksTab(context));
            try {
                String raw = FoodWidgetStore.tasksState(context);
                if (raw == null) return;
                JSONObject state = new JSONObject(raw);
                today = state.optString("today");
                JSONArray array = state.optJSONArray(tasksTab ? "tasks" : "notes");
                for (int i = 0; array != null && i < array.length(); i++) rows.add(array.getJSONObject(i));
            } catch (Exception ignored) {
                rows.clear();
            }
        }

        @Override public void onDestroy() { rows.clear(); }

        @Override public int getCount() { return rows.size(); }

        @Override
        public RemoteViews getViewAt(int position) {
            if (position < 0 || position >= rows.size()) return null;
            JSONObject row = rows.get(position);
            return tasksTab ? taskRow(row) : noteRow(row);
        }

        private RemoteViews taskRow(JSONObject row) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_task_row);
            boolean important = row.optBoolean("important");
            views.setTextViewText(R.id.row_title, (important ? "★ " : "") + row.optString("title"));

            String due = row.isNull("due") ? "" : row.optString("due");
            String meta = dueLabel(due, row.isNull("time") ? "" : row.optString("time"));
            views.setTextViewText(R.id.row_meta, meta);
            views.setViewVisibility(R.id.row_meta, meta.isEmpty() ? android.view.View.GONE : android.view.View.VISIBLE);
            boolean overdue = !due.isEmpty() && !today.isEmpty() && due.compareTo(today) < 0;
            boolean isToday = due.equals(today);
            int color = overdue ? R.color.widget_danger : isToday ? R.color.widget_accent : R.color.widget_muted;
            views.setTextColor(R.id.row_meta, ContextCompat.getColor(context, color));

            Intent complete = new Intent().putExtra(TasksActionActivity.EXTRA_ACTION, TasksActionActivity.ACTION_COMPLETE)
                .putExtra(TasksActionActivity.EXTRA_ID, row.optString("id"));
            views.setOnClickFillInIntent(R.id.row_check, complete);
            Intent open = new Intent().putExtra(TasksActionActivity.EXTRA_ACTION, TasksActionActivity.ACTION_OPEN_TASKS);
            views.setOnClickFillInIntent(R.id.row_body, open);
            return views;
        }

        private RemoteViews noteRow(JSONObject row) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_note_row);
            String prefix = row.optBoolean("pinned") ? "📌 " : row.optBoolean("locked") ? "🔒 " : "";
            views.setTextViewText(R.id.note_title, prefix + row.optString("title"));
            String snippet = row.optString("snippet");
            views.setTextViewText(R.id.note_snippet, snippet);
            views.setViewVisibility(R.id.note_snippet, snippet.isEmpty() ? android.view.View.GONE : android.view.View.VISIBLE);
            Intent open = new Intent().putExtra(TasksActionActivity.EXTRA_ACTION, TasksActionActivity.ACTION_OPEN_NOTES);
            views.setOnClickFillInIntent(R.id.note_body, open);
            return views;
        }

        private String dueLabel(String due, String time) {
            if (due.isEmpty()) return "";
            String suffix = time.length() >= 5 ? " · " + time.substring(0, 5) : "";
            if (due.equals(today)) return "Dziś" + suffix;
            if (due.equals(shift(today, 1))) return "Jutro" + suffix;
            if (!today.isEmpty() && due.compareTo(today) < 0) return "Po terminie · " + shortDate(due);
            return shortDate(due) + suffix;
        }

        private String shortDate(String date) {
            return date.length() >= 10 ? date.substring(8, 10) + "." + date.substring(5, 7) : date;
        }

        private String shift(String date, int days) {
            try {
                SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
                Calendar cal = Calendar.getInstance();
                cal.setTime(format.parse(date));
                cal.add(Calendar.DAY_OF_MONTH, days);
                return format.format(cal.getTime());
            } catch (Exception e) {
                return "";
            }
        }

        @Override public RemoteViews getLoadingView() { return null; }

        @Override public int getViewTypeCount() { return 2; }

        @Override public long getItemId(int position) { return position; }

        @Override public boolean hasStableIds() { return false; }
    }
}
