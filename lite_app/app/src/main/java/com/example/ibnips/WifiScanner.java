package com.example.ibnips;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.net.wifi.ScanResult;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.SystemClock;
import android.util.Log;

import java.util.ArrayList;
import java.util.List;

/**
 * Static helper that wraps WifiManager for scan initiation, result retrieval,
 * and freshness validation.
 */
public class WifiScanner {

    private static final String TAG = "ibnIPS-Wifi";

    private WifiScanner() {}

    /**
     * Checks whether Location Services (GPS / Network location) are enabled in System Settings.
     */
    public static boolean isLocationEnabled(Context context) {
        try {
            LocationManager lm = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
            if (lm == null) return false;
            boolean gps = lm.isProviderEnabled(LocationManager.GPS_PROVIDER);
            boolean network = lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
            return gps || network;
        } catch (Exception e) {
            Log.e(TAG, "isLocationEnabled check failed", e);
            return true;
        }
    }

    /**
     * Initiates a Wi-Fi hardware scan.
     */
    public static boolean startScan(Context context) {
        try {
            WifiManager wifi = (WifiManager) context.getApplicationContext()
                    .getSystemService(Context.WIFI_SERVICE);
            if (wifi == null) {
                Log.w(TAG, "WifiManager not available");
                return false;
            }
            if (!wifi.isWifiEnabled()) {
                Log.w(TAG, "Wi-Fi is disabled on device");
                return false;
            }
            boolean started = wifi.startScan();
            Log.d(TAG, "startScan() returned: " + started);
            return started;
        } catch (SecurityException e) {
            Log.e(TAG, "startScan: missing permissions", e);
            return false;
        } catch (Exception e) {
            Log.e(TAG, "startScan: unexpected error", e);
            return false;
        }
    }

    /**
     * Calculates the age of a ScanResult in milliseconds using boot-time nanos.
     * Returns -1 if timestamp is invalid or unpopulated.
     */
    public static long getScanAgeMs(ScanResult sr) {
        if (sr == null || sr.timestamp <= 0) return -1;
        long nowMicros = SystemClock.elapsedRealtimeNanos() / 1000;
        long diffMicros = nowMicros - sr.timestamp;
        if (diffMicros < 0) return 0;
        return diffMicros / 1000; // convert to ms
    }

    /**
     * Returns all available scan results from WifiManager.
     */
    public static List<WifiScanResult> getLastScanResults(Context context) {
        return getFreshScanResults(context, -1);
    }

    /**
     * Returns scan results, filtering out results older than maxAgeMs if maxAgeMs > 0.
     *
     * @param context   Context
     * @param maxAgeMs  Maximum age in ms (e.g. 10000 for 10s). Pass <= 0 to ignore age filter.
     */
    public static List<WifiScanResult> getFreshScanResults(Context context, long maxAgeMs) {
        List<WifiScanResult> results = new ArrayList<>();
        try {
            WifiManager wifi = (WifiManager) context.getApplicationContext()
                    .getSystemService(Context.WIFI_SERVICE);
            if (wifi == null) return results;

            List<ScanResult> rawResults = wifi.getScanResults();
            if (rawResults == null) return results;

            long minFreshAge = Long.MAX_VALUE;

            for (ScanResult sr : rawResults) {
                String bssid = sr.BSSID != null ? sr.BSSID : "";
                String ssid  = sr.SSID  != null ? sr.SSID  : "";
                int    rssi  = sr.level;

                long ageMs = getScanAgeMs(sr);
                if (ageMs >= 0 && ageMs < minFreshAge) {
                    minFreshAge = ageMs;
                }

                // If maxAgeMs filter specified and result is older, skip it
                if (maxAgeMs > 0 && ageMs > maxAgeMs) {
                    Log.d(TAG, "Skipping stale AP: " + bssid + " (age: " + (ageMs / 1000) + "s)");
                    continue;
                }

                results.add(new WifiScanResult(bssid, ssid, rssi));
            }

            if (minFreshAge != Long.MAX_VALUE) {
                Log.d(TAG, "Scan results parsed: " + results.size() + " APs (newest scan age: " + (minFreshAge / 1000) + "s)");
            } else {
                Log.d(TAG, "Scan results parsed: " + results.size() + " APs");
            }
        } catch (SecurityException e) {
            Log.e(TAG, "getFreshScanResults: missing permissions", e);
        } catch (Exception e) {
            Log.e(TAG, "getFreshScanResults: error", e);
        }
        return results;
    }

    /**
     * Request runtime permissions.
     */
    public static void requestLocationPermissions(android.app.Activity activity, int requestCode) {
        List<String> perms = new ArrayList<>();
        if (activity.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            perms.add(Manifest.permission.ACCESS_FINE_LOCATION);
        }
        if (activity.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            perms.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        }
        if (activity.checkSelfPermission(Manifest.permission.CHANGE_WIFI_STATE) != PackageManager.PERMISSION_GRANTED) {
            perms.add(Manifest.permission.CHANGE_WIFI_STATE);
        }
        if (Build.VERSION.SDK_INT >= 33) {
            if (activity.checkSelfPermission("android.permission.NEARBY_WIFI_DEVICES") != PackageManager.PERMISSION_GRANTED) {
                perms.add("android.permission.NEARBY_WIFI_DEVICES");
            }
        }
        if (!perms.isEmpty()) {
            activity.requestPermissions(perms.toArray(new String[0]), requestCode);
        }
    }
}
