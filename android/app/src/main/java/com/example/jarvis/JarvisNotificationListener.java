package com.example.jarvis;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONArray;
import org.json.JSONObject;

public class JarvisNotificationListener extends NotificationListenerService {

    private static final String PREFS = "jarvis_notifications";
    private static final String KEY = "recent";
    private static final int MAX_STORED = 20;

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            Notification notif = sbn.getNotification();
            if (notif == null) return;
            Bundle extras = notif.extras;
            if (extras == null) return;

            CharSequence titleCs = extras.getCharSequence(Notification.EXTRA_TITLE);
            CharSequence textCs = extras.getCharSequence(Notification.EXTRA_TEXT);
            String title = titleCs != null ? titleCs.toString() : "";
            String text = textCs != null ? textCs.toString() : "";
            if (title.isEmpty() && text.isEmpty()) return;

            JSONObject entry = new JSONObject();
            entry.put("app", sbn.getPackageName());
            entry.put("title", title);
            entry.put("text", text);
            entry.put("time", sbn.getPostTime());

            SharedPreferences prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONArray arr;
            try {
                arr = new JSONArray(prefs.getString(KEY, "[]"));
            } catch (Exception e) {
                arr = new JSONArray();
            }
            arr.put(entry);
            // keep only last MAX_STORED entries
            JSONArray trimmed = new JSONArray();
            int start = Math.max(0, arr.length() - MAX_STORED);
            for (int i = start; i < arr.length(); i++) {
                trimmed.put(arr.get(i));
            }
            prefs.edit().putString(KEY, trimmed.toString()).apply();
        } catch (Exception ignored) {
        }
    }

    static String getStoredNotificationsJson(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        return prefs.getString(KEY, "[]");
    }
}
