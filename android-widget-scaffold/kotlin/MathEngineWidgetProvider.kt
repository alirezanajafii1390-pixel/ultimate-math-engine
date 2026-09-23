package dev.mathengine.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

/**
 * Math Engine — Home Screen Widget V1
 *
 * Scope (Phase 3, Stage 3.7): a real, installable Android widget whose
 * only job is to prove the pipeline —
 *   Android Launcher → Widget → tap → Math Engine app opens
 * — end to end. Deliberately NOT reading any app data (no last result,
 * no pinned formulas): core/storage.ts is plain localStorage inside the
 * WebView, which this widget process cannot read directly. A V2 that
 * shows live data needs an explicit bridge (@capacitor/preferences,
 * backed by SharedPreferences, which — unlike localStorage — a widget
 * CAN read directly) and was intentionally deferred, per the Phase 3
 * decision that V1 must be real but does not need to be feature-rich.
 *
 * No React state, no WebView, no Capacitor bridge is touched here at
 * all — this is a plain native Android widget that only knows how to
 * launch the app's MainActivity. That's the whole V1 contract.
 */
class MathEngineWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (widgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, widgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_math_engine)

        // Launch the same MainActivity Capacitor already generates —
        // this is NOT a second entry point, it's the existing app.
        val launchIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = android.app.PendingIntent.getActivity(
            context,
            0,
            launchIntent,
            android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE,
        )

        // Whole-widget tap target for V1 — the entire surface opens the
        // app. A V2 with multiple actions (e.g. separate "Calculator" /
        // "Converter" shortcuts) would set distinct PendingIntents on
        // individual child views instead of this one root click target.
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

        appWidgetManager.updateAppWidget(widgetId, views)
    }
}
