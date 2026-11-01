package com.example.ibnips.people;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.wifi.ScanResult;
import android.net.wifi.WifiManager;
import android.os.Build;

import com.example.ibnips.people.models.WifiScanResult;

import java.util.ArrayList;
import java.util.List;

/**
 * Thin wrapper around Android Wi-Fi scanning.
 *
 * Requires ACCESS_FINE_LOCATION (and CHANGE_WIFI_STATE / ACCESS_WIFI_STATE).
 * Results are filtered to networks with a usable BSSID + RSSI.
 */
public class WifiScanner {

    /** Request code used when asking for location permission. */
    public static final int PERM_REQ = 1002;

    /** Ask for location permission if not yet granted. */
    public static boolean requestLocationPermissions(Activity activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (activity.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                    != PackageManager.PERMISSION_GRANTED) {
                activity.requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, PERM_REQ);
                return false;
            }
            if (activity.checkSelfPermission(Manifest.permission.NEARBY_WIFI_DEVICES)
                    != PackageManager.PERMISSION_GRANTED) {
                activity.requestPermissions(new String[]{Manifest.permission.NEARBY_WIFI_DEVICES}, PERM_REQ);
                return false;
            }
        } else {
            if (activity.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                    != PackageManager.PERMISSION_GRANTED
                    || activity.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)
                    != PackageManager.PERMISSION_GRANTED) {
                activity.requestPermissions(new String[]{
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION}, PERM_REQ);
                return false;
            }
        }
        return true;
    }

    /** Whether Wi-Fi + location are enabled. */
    public static boolean isReady(Context context) {
        WifiManager wm = (WifiManager) context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        if (wm == null) return false;
        return wm.isWifiEnabled();
    }

    /** Trigger a scan. Returns true if the scan was started. */
    public static boolean startScan(Context context) {
        WifiManager wm = (WifiManager) context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        if (wm == null) return false;
        return wm.startScan();
    }

    /** Read the most recent scan results, converting to our model. */
    public static List<WifiScanResult> getResults(Context context) {
        WifiManager wm = (WifiManager) context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        if (wm == null) return new ArrayList<>();
        List<ScanResult> raw = wm.getScanResults();
        if (raw == null) return new ArrayList<>();
        List<WifiScanResult> out = new ArrayList<>();
        for (ScanResult r : raw) {
            if (r.BSSID == null || r.BSSID.isEmpty()) continue;
            out.add(new WifiScanResult(r.BSSID, r.SSID == null ? "" : r.SSID, r.level));
        }
        return out;
    }
}
