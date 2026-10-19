package app.vanguard.os;

import android.app.Activity;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.text.InputType;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.content.ContextCompat;

import org.json.JSONObject;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Sheet over the home screen for adding a task (with a date and a star) or a note — the app stays closed. */
public class QuickAddActivity extends Activity {

    static final String EXTRA_TAB = "tab";
    private static final String[] DUE_VALUES = { "today", "tomorrow", "none" };
    private static final String[] DUE_LABELS = { "Dziś", "Jutro", "Bez daty" };

    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private LinearLayout sheet;
    private EditText input;
    private boolean noteMode;
    private int dueIndex = 0;
    private boolean important = false;
    private boolean busy = false;
    private String draft = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE | WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE);
        noteMode = TasksWidgetProvider.TAB_NOTES.equals(getIntent().getStringExtra(EXTRA_TAB));

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(color(R.color.widget_sheet_dim));
        root.setOnClickListener(v -> { if (!busy) finish(); });
        sheet = new LinearLayout(this);
        sheet.setOrientation(LinearLayout.VERTICAL);
        sheet.setBackgroundResource(R.drawable.widget_sheet_bg);
        sheet.setPadding(dp(20), dp(20), dp(20), dp(24));
        sheet.setClickable(true);
        root.addView(sheet, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM));
        setContentView(root);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int bottom = Build.VERSION.SDK_INT >= 30
                ? insets.getInsets(WindowInsets.Type.ime() | WindowInsets.Type.systemBars()).bottom
                : insets.getSystemWindowInsetBottom();
            v.setPadding(0, 0, 0, bottom);
            return insets;
        });

        if (!FoodWidgetStore.hasCredentials(this)) {
            Toast.makeText(this, "Otwórz aplikację raz, żeby połączyć widget.", Toast.LENGTH_LONG).show();
            startActivity(FoodWidgetIntents.openAppIntent(this));
            finish();
            return;
        }
        show();
    }

    @Override
    protected void onDestroy() {
        io.shutdownNow();
        super.onDestroy();
    }

    private void show() {
        busy = false;
        if (input != null) draft = input.getText().toString();
        sheet.removeAllViews();

        LinearLayout tabs = new LinearLayout(this);
        tabs.setOrientation(LinearLayout.HORIZONTAL);
        tabs.addView(chip("Zadanie", !noteMode, v -> { noteMode = false; show(); }), weighted(1, 0));
        tabs.addView(chip("Notatka", noteMode, v -> { noteMode = true; show(); }), weighted(1, dp(8)));
        sheet.addView(tabs);

        input = new EditText(this);
        input.setHint(noteMode ? "Treść notatki" : "Co masz do zrobienia?");
        input.setHintTextColor(color(R.color.widget_muted));
        input.setTextColor(color(R.color.widget_text));
        input.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        input.setBackgroundResource(R.drawable.widget_btn_soft);
        input.setPadding(dp(14), dp(12), dp(14), dp(12));
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        input.setMinLines(noteMode ? 4 : 2);
        input.setMaxLines(8);
        input.setText(draft);
        input.setSelection(draft.length());
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, dp(14), 0, dp(12));
        sheet.addView(input, lp);

        if (!noteMode) {
            LinearLayout options = new LinearLayout(this);
            options.setOrientation(LinearLayout.HORIZONTAL);
            for (int i = 0; i < DUE_LABELS.length; i++) {
                final int index = i;
                options.addView(chip(DUE_LABELS[i], dueIndex == i, v -> { dueIndex = index; show(); }), weighted(1, i == 0 ? 0 : dp(6)));
            }
            options.addView(chip("★", important, v -> { important = !important; show(); }), weighted(0.6f, dp(6)));
            LinearLayout.LayoutParams ol = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            ol.setMargins(0, 0, 0, dp(14));
            sheet.addView(options, ol);
        }

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        actions.addView(button("Anuluj", false, v -> finish()), weighted(1, 0));
        actions.addView(button(busy ? "Zapisuję…" : "Dodaj", true, v -> save()), weighted(1.6f, dp(8)));
        sheet.addView(actions);

        input.requestFocus();
        input.post(() -> {
            InputMethodManager imm = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
            if (imm != null) imm.showSoftInput(input, 0);
        });
    }

    private void save() {
        final String text = input.getText().toString().trim();
        if (text.isEmpty()) {
            input.setError(noteMode ? "Wpisz treść notatki" : "Wpisz treść zadania");
            return;
        }
        if (busy) return;
        busy = true;
        draft = text;
        io.execute(() -> {
            try {
                JSONObject body = new JSONObject();
                if (noteMode) {
                    body.put("action", "add_note").put("text", text);
                } else {
                    body.put("action", "add_task").put("title", text).put("due", DUE_VALUES[dueIndex]).put("important", important);
                }
                JSONObject result = FoodWidgetApi.call(this, "widget-tasks", body);
                TasksWidgetProvider.applyState(this, result.optJSONObject("state"));
                runOnUiThread(() -> {
                    Toast.makeText(this, noteMode ? "Notatka dodana" : "Zadanie dodane", Toast.LENGTH_SHORT).show();
                    finish();
                });
            } catch (FoodWidgetApi.ApiException e) {
                runOnUiThread(() -> fail(e.getMessage()));
            } catch (Exception e) {
                runOnUiThread(() -> fail("Brak połączenia. Nic nie zapisano — spróbuj ponownie."));
            }
        });
    }

    private void fail(String message) {
        busy = false;
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }

    // ── small view helpers ─────────────────────────────────────────────────

    private int color(int res) { return ContextCompat.getColor(this, res); }

    private int dp(int value) { return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value, getResources().getDisplayMetrics())); }

    private LinearLayout.LayoutParams weighted(float weight, int marginStart) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, weight);
        lp.setMarginStart(marginStart);
        return lp;
    }

    private TextView label(String text, int colorRes) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        view.setTextColor(color(colorRes));
        view.setTypeface(view.getTypeface(), Typeface.BOLD);
        view.setGravity(Gravity.CENTER);
        return view;
    }

    private TextView chip(String text, boolean selected, View.OnClickListener click) {
        TextView view = label(text, selected ? R.color.widget_on_accent : R.color.widget_text);
        view.setBackgroundResource(selected ? R.drawable.widget_btn_primary : R.drawable.widget_btn_soft);
        view.setPadding(dp(6), dp(11), dp(6), dp(11));
        view.setOnClickListener(click);
        return view;
    }

    private TextView button(String text, boolean primary, View.OnClickListener click) {
        TextView view = label(text, primary ? R.color.widget_on_accent : R.color.widget_text);
        view.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        view.setBackgroundResource(primary ? R.drawable.widget_btn_primary : R.drawable.widget_btn_soft);
        view.setPadding(dp(8), dp(14), dp(8), dp(14));
        view.setOnClickListener(click);
        return view;
    }
}
