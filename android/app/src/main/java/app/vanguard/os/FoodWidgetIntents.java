package app.vanguard.os;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;

/** PendingIntents shared by the food card and bar widgets. */
final class FoodWidgetIntents {

    static final String EXTRA_MODE = "mode";
    static final String MODE_PHOTO = "photo";
    static final String MODE_SCAN = "scan";
    static final String MODE_TEXT = "text";

    private static final int FLAGS = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;

    private FoodWidgetIntents() {}

    /** Opens the small quick-add sheet over the home screen — the main app is not launched. */
    static PendingIntent capture(Context context, String mode, int requestCode) {
        Intent intent = new Intent(context, QuickFoodActivity.class)
            .putExtra(EXTRA_MODE, mode)
            .setData(Uri.parse("sparky://food/" + mode))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        return PendingIntent.getActivity(context, requestCode, intent, FLAGS);
    }

    static Intent openAppIntent(Context context) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://localhost/dzis"));
        intent.setPackage(context.getPackageName());
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return intent;
    }

    static PendingIntent openApp(Context context, int requestCode) {
        return PendingIntent.getActivity(context, requestCode, openAppIntent(context), FLAGS);
    }
}
