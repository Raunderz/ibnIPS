package com.raunderz.icps;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.net.wifi.ScanResult;
import android.net.wifi.WifiManager;
import android.os.Build;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Exposes passive Android Wi-Fi scanning to React Native.
 *
 * <p>Instead of calling {@link WifiManager#startScan()} repeatedly (which the OS
 * throttles), this module listens for the {@link WifiManager#SCAN_RESULTS_AVAILABLE_ACTION}
 * broadcast and forwards each result set to JS via the "wifiScansReceived" event.
 * One initial scan is triggered on start so results appear quickly.</p>
 */
public class WifiScannerModule extends ReactContextBaseJavaModule {

  public static final String NAME = "WifiScanner";
  private static final String EVENT_SCANS_RECEIVED = "wifiScansReceived";
  private static final String ACTION_SCAN_RESULTS = WifiManager.SCAN_RESULTS_AVAILABLE_ACTION;

  private final ReactApplicationContext reactContext;
  private WifiManager wifiManager;
  private BroadcastReceiver scanReceiver;

  public WifiScannerModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
    this.wifiManager =
        (WifiManager) reactContext.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
  }

  @Override
  public String getName() {
    return NAME;
  }

  @ReactMethod
  public void startScanning() {
    if (scanReceiver != null) {
      return; // Already listening
    }

    scanReceiver =
        new BroadcastReceiver() {
          @Override
          public void onReceive(Context context, Intent intent) {
            if (ACTION_SCAN_RESULTS.equals(intent.getAction())) {
              sendScanResults();
            }
          }
        };

    IntentFilter filter = new IntentFilter(ACTION_SCAN_RESULTS);
    reactContext.registerReceiver(scanReceiver, filter);

    // Kick off a single initial scan. The system throttles repeated calls, so
    // all subsequent updates come from the broadcast listener.
    if (hasScanPermission() && wifiManager != null && wifiManager.isWifiEnabled()) {
      wifiManager.startScan();
    }
  }

  @ReactMethod
  public void stopScanning() {
    if (scanReceiver != null) {
      try {
        reactContext.unregisterReceiver(scanReceiver);
      } catch (IllegalArgumentException ignored) {
        // Already unregistered
      }
      scanReceiver = null;
    }
  }

  @ReactMethod
  public void getLastScans() {
    // Results are delivered via events; kept for JS API symmetry.
  }

  @ReactMethod
  public void addListener(String eventName) {
    // Kept for NativeEventEmitter compatibility.
  }

  @ReactMethod
  public void removeListeners(Integer count) {
    // Kept for NativeEventEmitter compatibility.
  }

  private boolean hasScanPermission() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      return reactContext.checkSelfPermission(Manifest.permission.NEARBY_WIFI_DEVICES)
          == PackageManager.PERMISSION_GRANTED;
    }
    return reactContext.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED
        || reactContext.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)
            == PackageManager.PERMISSION_GRANTED;
  }

  private void sendScanResults() {
    if (!hasScanPermission() || wifiManager == null) {
      return;
    }

    List<ScanResult> results = wifiManager.getScanResults();

    // Deduplicate by BSSID, keeping the strongest reading per network.
    Map<String, WritableMap> byBssid = new HashMap<>();
    for (ScanResult result : results) {
      String bssid = result.BSSID != null ? result.BSSID : "";
      WritableMap existing = byBssid.get(bssid);
      if (existing != null && existing.getInt("rssi") >= result.level) {
        continue;
      }

      WritableMap map = Arguments.createMap();
      map.putString("bssid", bssid);
      map.putString("ssid", result.SSID != null ? result.SSID : "");
      map.putInt("rssi", result.level);
      map.putInt("frequency", result.frequency);
      byBssid.put(bssid, map);
    }

    List<WritableMap> values = new ArrayList<>(byBssid.values());
    Collections.sort(
        values,
        new Comparator<WritableMap>() {
          @Override
          public int compare(WritableMap a, WritableMap b) {
            return b.getInt("rssi") - a.getInt("rssi");
          }
        });

    WritableArray array = Arguments.createArray();
    for (WritableMap map : values) {
      array.pushMap(map);
    }

    WritableMap payload = Arguments.createMap();
    payload.putArray("scans", array);

    reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
        .emit(EVENT_SCANS_RECEIVED, payload);
  }
}
