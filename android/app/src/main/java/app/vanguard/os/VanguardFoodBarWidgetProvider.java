package app.vanguard.os;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;

/** 4×1 bar: photo, barcode scan, typed text — each opens the quick-add sheet. */
public class VanguardFoodBarWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_food_bar);
            views.setOnClickPendingIntent(R.id.widget_bar_photo, FoodWidgetIntents.capture(context, FoodWidgetIntents.MODE_PHOTO, 31));
            views.setOnClickPendingIntent(R.id.widget_bar_scan, FoodWidgetIntents.capture(context, FoodWidgetIntents.MODE_SCAN, 32));
            views.setOnClickPendingIntent(R.id.widget_bar_text, FoodWidgetIntents.capture(context, FoodWidgetIntents.MODE_TEXT, 33));
            manager.updateAppWidget(id, views);
        }
    }
}
