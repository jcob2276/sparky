package app.vanguard.os;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

/** Invisible trampoline for taps on list rows: complete a task in place, or open the app on the right screen. */
public class TasksActionActivity extends Activity {

    static final String EXTRA_ACTION = "rowAction";
    static final String EXTRA_ID = "rowId";
    static final String ACTION_COMPLETE = "complete";
    static final String ACTION_OPEN_TASKS = "open_tasks";
    static final String ACTION_OPEN_NOTES = "open_notes";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        String action = getIntent().getStringExtra(EXTRA_ACTION);
        if (ACTION_COMPLETE.equals(action)) {
            complete(getIntent().getStringExtra(EXTRA_ID));
        } else if (ACTION_OPEN_TASKS.equals(action) || ACTION_OPEN_NOTES.equals(action)) {
            String path = ACTION_OPEN_NOTES.equals(action) ? "/keep" : "/todo";
            Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse("https://localhost" + path));
            open.setPackage(getPackageName());
            open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(open);
        }
        finish();
        overridePendingTransition(0, 0);
    }

    /** The row disappears at once (optimistic); the server call follows and its snapshot replaces the cache. */
    private void complete(String id) {
        if (id == null) return;
        final android.content.Context app = getApplicationContext();
        removeFromCache(app, id);
        TasksWidgetProvider.render(app);
        new Thread(() -> {
            String error = null;
            try {
                JSONObject result = FoodWidgetApi.call(app, "widget-tasks", new JSONObject().put("action", "complete").put("id", id));
                TasksWidgetProvider.applyState(app, result.optJSONObject("state"));
            } catch (FoodWidgetApi.ApiException e) {
                error = e.status == 404 ? null : e.getMessage();
            } catch (Exception e) {
                error = "Brak połączenia — zadanie wróci na listę.";
            }
            if (error != null) {
                final String message = error;
                new Handler(Looper.getMainLooper()).post(() -> Toast.makeText(app, message, Toast.LENGTH_LONG).show());
            }
            TasksWidgetProvider.updateAll(app);
        }).start();
    }

    private static void removeFromCache(android.content.Context context, String id) {
        try {
            String raw = FoodWidgetStore.tasksState(context);
            if (raw == null) return;
            JSONObject state = new JSONObject(raw);
            JSONArray tasks = state.optJSONArray("tasks");
            JSONArray kept = new JSONArray();
            for (int i = 0; tasks != null && i < tasks.length(); i++) {
                JSONObject task = tasks.getJSONObject(i);
                if (!id.equals(task.optString("id"))) kept.put(task);
            }
            state.put("tasks", kept);
            JSONObject counts = state.optJSONObject("counts");
            if (counts != null) counts.put("open", Math.max(0, counts.optInt("open") - 1));
            FoodWidgetStore.saveTasksState(context, state.toString());
        } catch (Exception ignored) {
            // cache stays as is; the refresh after the call fixes it
        }
    }
}
