package com.example.ibnips;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.wifi.ScanResult;
import android.net.wifi.WifiManager;
import android.util.Log;

import java.util.ArrayList;
import java.util.List;

/**
 * Static helper that wraps WifiManager for scan initiation and result retrieval.
 *
 * Callers must have ACCESS_FINE_LOCATION and CHANGE_WIFI_STATE granted at
 * runtime (Android 6+) before calling any method.
 */
public class WifiScanner {

    private static final String TAG = "ibnIPS-Wifi";

    // Private constructor — utility class, no instantiation
    private WifiScanner() {}

    // ------------------------------------------------------------------
    // startScan — kick off a new scan cycle
    // ------------------------------------------------------------------

    /**
     * Initiates a Wi-Fi scan. Results are NOT immediately available; the OS
     * delivers them asynchronously. Call getLastScanResults() after a short
     * delay (typically 2–4 seconds).
     *
     * @param context application or activity context
     * @return true if the scan was successfully requested
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
                Log.w(TAG, "Wi-Fi is disabled");
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

    // ------------------------------------------------------------------
    // getLastScanResults — return the most recent cached scan
    // ------------------------------------------------------------------

    /**
     * Returns the most recently cached scan results from WifiManager.
     * These are the results from the last completed scan (started by
     * startScan() or the OS itself).
     *
     * @param context application or activity context
     * @return list of scan results (may be empty, never null)
     */
    public static List<WifiScanResult> getLastScanResults(Context context) {
        List<WifiScanResult> results = new ArrayList<>();
        try {
            WifiManager wifi = (WifiManager) context.getApplicationContext()
                    .getSystemService(Context.WIFI_SERVICE);
            if (wifi == null) {
                Log.w(TAG, "WifiManager not available");
                return results;
            }

            List<ScanResult> rawResults = wifi.getScanResults();
            if (rawResults == null) {
                Log.w(TAG, "getScanResults() returned null");
                return results;
            }

            for (ScanResult sr : rawResults) {
                String bssid = sr.BSSID != null ? sr.BSSID : "";
                String ssid  = sr.SSID  != null ? sr.SSID  : "";
                int    rssi  = sr.level; // dBm

                WifiScanResult result = new WifiScanResult(bssid, ssid, rssi);
                results.add(result);
                Log.d(TAG, "AP: " + bssid + " (" + ssid + ") " + rssi + " dBm");
            }

            Log.d(TAG, "Total APs found: " + results.size());
        } catch (SecurityException e) {
            Log.e(TAG, "getLastScanResults: missing permissions", e);
        } catch (Exception e) {
            Log.e(TAG, "getLastScanResults: unexpected error", e);
        }
        return results;
    }

    // ------------------------------------------------------------------
    // requestLocationPermissions — call from an Activity
    // ------------------------------------------------------------------

    /**
     * Convenience wrapper — call this from MainActivity.onCreate() or
     * before the first scan to request runtime permissions.
     *
     * The Activity should implement onRequestPermissionsResult() to handle
     * the user's response.
     *
     * @param activity the calling Activity
     * @param requestCode passed back in onRequestPermissionsResult()
     */
    public static void requestLocationPermissions(android.app.Activity activity,
                                                  int requestCode) {
        if (activity.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            activity.requestPermissions(
                    new String[]{
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION,
                            Manifest.permission.CHANGE_WIFI_STATE,
                    },
                    requestCode
            );
        }
    }
}
