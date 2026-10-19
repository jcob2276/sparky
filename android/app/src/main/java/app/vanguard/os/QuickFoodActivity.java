package app.vanguard.os;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Matrix;
import android.media.ExifInterface;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.util.Base64;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Small sheet over the home screen: capture (photo / scan / text), review what was recognised, save.
 * The main app is never opened.
 */
public class QuickFoodActivity extends Activity {

    private static final int REQ_PHOTO = 4101;
    private static final int REQ_CAMERA_PERMISSION = 4103;
    private static final String[] MEAL_TYPES = { "breakfast", "lunch", "dinner", "snack" };
    private static final String[] MEAL_LABELS = { "Śniadanie", "Obiad", "Kolacja", "Przekąska" };

    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private LinearLayout sheet;
    private File photoFile;
    private String mode;
    private String mealType;
    private List<JSONObject> items = new ArrayList<>();
    private boolean busy = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

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
            int bottom = android.os.Build.VERSION.SDK_INT >= 30
                ? insets.getInsets(android.view.WindowInsets.Type.ime() | android.view.WindowInsets.Type.systemBars()).bottom
                : insets.getSystemWindowInsetBottom();
            v.setPadding(0, 0, 0, bottom);
            return insets;
        });

        mealType = defaultMealType();
        mode = getIntent().getStringExtra(FoodWidgetIntents.EXTRA_MODE);
        if (!FoodWidgetStore.hasCredentials(this)) {
            Toast.makeText(this, "Otwórz aplikację raz, żeby połączyć widget.", Toast.LENGTH_LONG).show();
            startActivity(FoodWidgetIntents.openAppIntent(this));
            finish();
            return;
        }
        if (savedInstanceState == null) start();
    }

    @Override
    protected void onDestroy() {
        io.shutdownNow();
        super.onDestroy();
    }

    private void start() {
        if (FoodWidgetIntents.MODE_PHOTO.equals(mode)) {
            launchCamera();
        } else if (FoodWidgetIntents.MODE_SCAN.equals(mode)) {
            launchScanner();
        } else {
            showTextInput("");
        }
    }

    private String defaultMealType() {
        try {
            JSONObject state = new JSONObject(String.valueOf(FoodWidgetStore.state(this)));
            String fromState = state.optString("mealType");
            if (!fromState.isEmpty()) return fromState;
        } catch (Exception ignored) {
            // fall back to the clock
        }
        int hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
        if (hour < 11) return "breakfast";
        if (hour < 16) return "lunch";
        if (hour < 21) return "dinner";
        return "snack";
    }

    // ── capture ────────────────────────────────────────────────────────────

    private void launchCamera() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[] { Manifest.permission.CAMERA }, REQ_CAMERA_PERMISSION);
            return;
        }
        try {
            File dir = new File(getCacheDir(), "widget");
            //noinspection ResultOfMethodCallIgnored
            dir.mkdirs();
            photoFile = File.createTempFile("meal", ".jpg", dir);
            Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", photoFile);
            Intent intent = new Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE)
                .putExtra(android.provider.MediaStore.EXTRA_OUTPUT, uri)
                .addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivityForResult(intent, REQ_PHOTO);
        } catch (ActivityNotFoundException e) {
            showError("Brak aplikacji aparatu.", false);
        } catch (Exception e) {
            showError("Nie udało się uruchomić aparatu.", false);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQ_CAMERA_PERMISSION) return;
        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            launchCamera();
        } else {
            showError("Zezwól na aparat w ustawieniach, żeby robić zdjęcia posiłków.", false);
        }
    }

    private void launchScanner() {
        GmsBarcodeScannerOptions options = new GmsBarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_EAN_13, Barcode.FORMAT_EAN_8, Barcode.FORMAT_UPC_A, Barcode.FORMAT_UPC_E)
            .enableAutoZoom()
            .build();
        GmsBarcodeScanning.getClient(this, options).startScan()
            .addOnSuccessListener(barcode -> {
                String code = barcode.getRawValue();
                if (code == null || code.isEmpty()) {
                    showError("Nie odczytano kodu.", false);
                    return;
                }
                parse(new JSONObject(), code, null);
            })
            .addOnCanceledListener(this::finish)
            .addOnFailureListener(e -> showError("Skaner nie jest dostępny. Zaktualizuj Usługi Google Play.", false));
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_PHOTO) {
            if (resultCode == RESULT_OK && photoFile != null && photoFile.length() > 0) {
                showLoading("Rozpoznaję posiłek…");
                io.execute(() -> {
                    String encoded = encodePhoto(photoFile);
                    runOnUiThread(() -> {
                        if (encoded == null) showError("Nie udało się odczytać zdjęcia.", false);
                        else parse(new JSONObject(), null, encoded);
                    });
                });
            } else {
                finish();
            }
        }
    }

    private String encodePhoto(File file) {
        try {
            BitmapFactory.Options bounds = new BitmapFactory.Options();
            bounds.inJustDecodeBounds = true;
            BitmapFactory.decodeFile(file.getAbsolutePath(), bounds);
            int sample = 1;
            while (Math.max(bounds.outWidth, bounds.outHeight) / sample > 1600) sample *= 2;
            BitmapFactory.Options opts = new BitmapFactory.Options();
            opts.inSampleSize = sample;
            Bitmap bitmap = BitmapFactory.decodeFile(file.getAbsolutePath(), opts);
            if (bitmap == null) return null;
            int orientation = new ExifInterface(file.getAbsolutePath()).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
            int degrees = orientation == ExifInterface.ORIENTATION_ROTATE_90 ? 90
                : orientation == ExifInterface.ORIENTATION_ROTATE_180 ? 180
                : orientation == ExifInterface.ORIENTATION_ROTATE_270 ? 270 : 0;
            if (degrees != 0) {
                Matrix matrix = new Matrix();
                matrix.postRotate(degrees);
                bitmap = Bitmap.createBitmap(bitmap, 0, 0, bitmap.getWidth(), bitmap.getHeight(), matrix, true);
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.JPEG, 82, out);
            //noinspection ResultOfMethodCallIgnored
            file.delete();
            return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
        } catch (Exception e) {
            return null;
        }
    }

    // ── backend ────────────────────────────────────────────────────────────

    private void parse(JSONObject extra, String barcode, String imageBase64) {
        showLoading(barcode != null ? "Szukam produktu…" : "Rozpoznaję posiłek…");
        io.execute(() -> {
            try {
                JSONObject body = extra.put("action", "parse");
                if (barcode != null) body.put("barcode", barcode);
                if (imageBase64 != null) body.put("imageBase64", imageBase64).put("mimeType", "image/jpeg");
                JSONArray parsed = FoodWidgetApi.call(this, body).optJSONArray("items");
                List<JSONObject> list = new ArrayList<>();
                for (int i = 0; parsed != null && i < parsed.length(); i++) list.add(parsed.getJSONObject(i));
                runOnUiThread(() -> {
                    items = list;
                    showResults();
                });
            } catch (FoodWidgetApi.ApiException e) {
                runOnUiThread(() -> showError(e.getMessage(), e.status != 401));
            } catch (Exception e) {
                runOnUiThread(() -> showError("Brak połączenia. Spróbuj ponownie.", true));
            }
        });
    }

    private void save() {
        if (items.isEmpty()) return;
        showLoading("Zapisuję…");
        final int kcal = totalKcal();
        io.execute(() -> {
            try {
                JSONArray array = new JSONArray();
                for (JSONObject item : items) array.put(item);
                JSONObject result = FoodWidgetApi.call(this, new JSONObject().put("action", "save").put("items", array).put("mealType", mealType));
                JSONObject state = result.optJSONObject("state");
                if (state != null) FoodWidgetStore.saveState(this, state.toString());
                VanguardFoodWidgetProvider.updateAll(this);
                runOnUiThread(() -> {
                    Toast.makeText(this, "Zapisano · " + kcal + " kcal", Toast.LENGTH_SHORT).show();
                    finish();
                });
            } catch (FoodWidgetApi.ApiException e) {
                runOnUiThread(() -> showError(e.getMessage(), true));
            } catch (Exception e) {
                runOnUiThread(() -> showError("Brak połączenia. Nic nie zapisano — spróbuj ponownie.", true));
            }
        });
    }

    // ── screens ────────────────────────────────────────────────────────────

    private void showLoading(String message) {
        busy = true;
        sheet.removeAllViews();
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.addView(new ProgressBar(this), new LinearLayout.LayoutParams(dp(28), dp(28)));
        TextView text = label(message, 16, R.color.widget_text, true);
        text.setPadding(dp(14), 0, 0, 0);
        row.addView(text);
        sheet.addView(row);
        sheet.setMinimumHeight(dp(120));
    }

    private void showError(String message, boolean canRetry) {
        busy = false;
        sheet.removeAllViews();
        sheet.addView(label("Nie udało się", 18, R.color.widget_text, true));
        TextView body = label(message, 14, R.color.widget_muted, false);
        body.setPadding(0, dp(6), 0, dp(16));
        sheet.addView(body);
        LinearLayout row = buttonRow();
        row.addView(button("Zamknij", false, v -> finish()), weight(1));
        if (canRetry) row.addView(button("Wpisz opis", true, v -> showTextInput("")), weight(1.4f));
        sheet.addView(row);
    }

    private void showTextInput(String prefill) {
        busy = false;
        sheet.removeAllViews();
        sheet.addView(label("Co zjadłeś?", 18, R.color.widget_text, true));
        EditText input = new EditText(this);
        input.setHint("np. 3 jajka i 2 kromki chleba żytniego");
        input.setHintTextColor(color(R.color.widget_muted));
        input.setTextColor(color(R.color.widget_text));
        input.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        input.setBackgroundResource(R.drawable.widget_btn_soft);
        input.setPadding(dp(14), dp(12), dp(14), dp(12));
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        input.setMinLines(2);
        input.setText(prefill);
        input.setSelection(prefill.length());
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, dp(12), 0, dp(14));
        sheet.addView(input, lp);
        LinearLayout row = buttonRow();
        row.addView(button("Anuluj", false, v -> finish()), weight(1));
        row.addView(button("Rozpoznaj", true, v -> {
            String text = input.getText().toString().trim();
            if (text.isEmpty()) {
                input.setError("Wpisz, co zjadłeś");
                return;
            }
            parse(new JSONObject().putOpt("text", text), null, null);
        }), weight(1.4f));
        sheet.addView(row);
        input.requestFocus();
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE | WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
    }

    private void showResults() {
        busy = false;
        sheet.removeAllViews();
        sheet.addView(label("Rozpoznano", 18, R.color.widget_text, true));
        for (int i = 0; i < items.size(); i++) {
            final int index = i;
            JSONObject item = items.get(i);
            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setGravity(Gravity.CENTER_VERTICAL);
            row.setPadding(0, dp(10), 0, 0);
            String text = item.optString("name") + " · " + Math.round(item.optDouble("grams", 0)) + " g · " + Math.round(item.optDouble("calories", 0)) + " kcal";
            TextView name = label(text, 15, R.color.widget_text, false);
            row.addView(name, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
            TextView remove = label("✕", 16, R.color.widget_muted, false);
            remove.setPadding(dp(12), dp(4), dp(4), dp(4));
            remove.setContentDescription("Usuń pozycję");
            remove.setOnClickListener(v -> {
                items.remove(index);
                if (items.isEmpty()) showTextInput(""); else showResults();
            });
            row.addView(remove);
            sheet.addView(row);
        }
        TextView total = label("Razem " + totalKcal() + " kcal · białko " + Math.round(totalOf("protein")) + " g", 13, R.color.widget_muted, false);
        total.setPadding(0, dp(10), 0, dp(12));
        sheet.addView(total);

        LinearLayout chips = new LinearLayout(this);
        chips.setOrientation(LinearLayout.HORIZONTAL);
        for (int i = 0; i < MEAL_TYPES.length; i++) {
            final String type = MEAL_TYPES[i];
            boolean selected = type.equals(mealType);
            TextView chip = label(MEAL_LABELS[i], 12, selected ? R.color.widget_on_accent : R.color.widget_text, true);
            chip.setGravity(Gravity.CENTER);
            chip.setBackgroundResource(selected ? R.drawable.widget_btn_primary : R.drawable.widget_btn_soft);
            chip.setPadding(0, dp(9), 0, dp(9));
            chip.setOnClickListener(v -> {
                mealType = type;
                showResults();
            });
            chips.addView(chip, weight(1, i == 0 ? 0 : dp(6)));
        }
        sheet.addView(chips);

        LinearLayout row = buttonRow();
        row.setPadding(0, dp(14), 0, 0);
        row.addView(button("Popraw", false, v -> showTextInput(describeItems())), weight(1));
        row.addView(button("Zapisz", true, v -> save()), weight(1.6f));
        sheet.addView(row);
    }

    // ── helpers ────────────────────────────────────────────────────────────

    private String describeItems() {
        StringBuilder out = new StringBuilder();
        for (JSONObject item : items) {
            if (out.length() > 0) out.append(", ");
            out.append(item.optString("name")).append(' ').append(Math.round(item.optDouble("grams", 0))).append(" g");
        }
        return out.toString();
    }

    private int totalKcal() { return (int) Math.round(totalOf("calories")); }

    private double totalOf(String key) {
        double sum = 0;
        for (JSONObject item : items) sum += item.optDouble(key, 0);
        return sum;
    }

    private int color(int res) { return ContextCompat.getColor(this, res); }

    private int dp(int value) { return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value, getResources().getDisplayMetrics())); }

    private TextView label(String text, int sp, int colorRes, boolean bold) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        view.setTextColor(color(colorRes));
        if (bold) view.setTypeface(view.getTypeface(), android.graphics.Typeface.BOLD);
        return view;
    }

    private LinearLayout buttonRow() {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        return row;
    }

    private LinearLayout.LayoutParams weight(float w) { return weight(w, 0); }

    private LinearLayout.LayoutParams weight(float w, int marginStart) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, w);
        lp.setMarginStart(marginStart == 0 ? 0 : marginStart);
        return lp;
    }

    private interface Click { void run(View v) throws Exception; }

    private TextView button(String text, boolean primary, Click click) {
        TextView view = label(text, 15, primary ? R.color.widget_on_accent : R.color.widget_text, true);
        view.setGravity(Gravity.CENTER);
        view.setBackgroundResource(primary ? R.drawable.widget_btn_primary : R.drawable.widget_btn_soft);
        view.setPadding(dp(8), dp(14), dp(8), dp(14));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1);
        view.setLayoutParams(lp);
        view.setOnClickListener(v -> {
            try {
                click.run(v);
            } catch (Exception e) {
                showError("Coś poszło nie tak.", true);
            }
        });
        return view;
    }
}
