package com.example.jarvis;

import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.text.TextUtils;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;
import java.util.Locale;

@CapacitorPlugin(name = "DeviceControl")
public class DeviceControlPlugin extends Plugin {

    private String flashCameraId = null;

    // ---------------- Flashlight ----------------
    @PluginMethod
    public void setFlashlight(PluginCall call) {
        boolean on = call.getBoolean("on", false);
        Context ctx = getContext();
        CameraManager camManager = (CameraManager) ctx.getSystemService(Context.CAMERA_SERVICE);
        try {
            if (flashCameraId == null) {
                for (String id : camManager.getCameraIdList()) {
                    CameraCharacteristics chars = camManager.getCameraCharacteristics(id);
                    Boolean hasFlash = chars.get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
                    Integer facing = chars.get(CameraCharacteristics.LENS_FACING);
                    if (hasFlash != null && hasFlash && facing != null && facing == CameraCharacteristics.LENS_FACING_BACK) {
                        flashCameraId = id;
                        break;
                    }
                }
            }
            if (flashCameraId == null) {
                call.reject("Perangkat ini tidak memiliki lampu senter (flash).");
                return;
            }
            camManager.setTorchMode(flashCameraId, on);
            JSObject ret = new JSObject();
            ret.put("on", on);
            call.resolve(ret);
        } catch (CameraAccessException e) {
            call.reject("Gagal mengakses kamera untuk senter: " + e.getMessage());
        }
    }

    // ---------------- Volume ----------------
    @PluginMethod
    public void setVolume(PluginCall call) {
        int percent = call.getInt("percent", 50);
        percent = Math.max(0, Math.min(100, percent));
        AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        int max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
        int target = Math.round(max * (percent / 100f));
        try {
            am.setStreamVolume(AudioManager.STREAM_MUSIC, target, 0);
            JSObject ret = new JSObject();
            ret.put("percent", percent);
            call.resolve(ret);
        } catch (SecurityException e) {
            call.reject("Tidak diizinkan mengubah volume: " + e.getMessage());
        }
    }

    // ---------------- Open app by fuzzy name ----------------
    @PluginMethod
    public void openApp(PluginCall call) {
        String query = call.getString("query", "");
        if (TextUtils.isEmpty(query)) {
            call.reject("Nama aplikasi kosong.");
            return;
        }
        PackageManager pm = getContext().getPackageManager();
        Intent mainIntent = new Intent(Intent.ACTION_MAIN, null);
        mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> apps = pm.queryIntentActivities(mainIntent, 0);

        String q = query.toLowerCase(Locale.ROOT).trim();
        ResolveInfo bestMatch = null;
        String bestLabel = null;

        for (ResolveInfo info : apps) {
            String label = info.loadLabel(pm).toString();
            String labelLower = label.toLowerCase(Locale.ROOT);
            if (labelLower.equals(q)) {
                bestMatch = info;
                bestLabel = label;
                break;
            }
            if (labelLower.contains(q) && bestMatch == null) {
                bestMatch = info;
                bestLabel = label;
            }
        }

        JSObject ret = new JSObject();
        if (bestMatch != null) {
            String pkg = bestMatch.activityInfo.packageName;
            Intent launch = pm.getLaunchIntentForPackage(pkg);
            if (launch != null) {
                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(launch);
                ret.put("success", true);
                ret.put("appName", bestLabel);
                ret.put("packageName", pkg);
                call.resolve(ret);
                return;
            }
        }
        ret.put("success", false);
        call.resolve(ret);
    }

    // ---------------- Settings shortcuts ----------------
    @PluginMethod
    public void openNotificationAccessSettings(PluginCall call) {
        Intent intent = new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void openOverlaySettings(PluginCall call) {
        Intent intent = new Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:" + getContext().getPackageName())
        );
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    // ---------------- Recent notifications (requires listener access granted) ----------------
    @PluginMethod
    public void getRecentNotifications(PluginCall call) {
        String json = JarvisNotificationListener.getStoredNotificationsJson(getContext());
        JSObject ret = new JSObject();
        ret.put("notifications", json);
        call.resolve(ret);
    }
}
