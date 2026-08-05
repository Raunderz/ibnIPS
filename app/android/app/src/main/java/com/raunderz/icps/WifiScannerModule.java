package com.raunderz.icps;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.wifi.ScanResult;
import android.net.wifi.WifiManager;
import androidx.annotation.Nullable;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class WifiScannerModule extends ReactContextBaseJavaModule {
  private static final String TAG = "WifiScannerModule";
  private static final String EVENT_NAME = "wifiScansReceived";
  private WifiManager wifiManager;
  private BroadcastReceiver wifiScanReceiver;
  private boolean isListening = false;

  public WifiScannerModule(ReactContext reactContext) {
    super(reactContext);
    this.wifiManager = (WifiManager) reactContext.getSystemService(Context.WIFI_SERVICE);
  }

  @Override
  public String getName() {
    return "WifiScanner";
  }

  @ReactMethod
  public void startScanning() {
    if (isListening) {
      return;
    }

    ReactContext context = getReactApplicationContext();
    wifiScanReceiver = new BroadcastReceiver() {
      @Override
      public void onReceive(Context context, Intent intent) {
        if (WifiManager.SCAN_RESULTS_AVAILABLE_ACTION.equals(intent.getAction())) {
          List<ScanResult> results = wifiManager.getScanResults();
          WritableArray networks = convertScanResultsToArray(results);
          sendEvent(context, EVENT_NAME, networks);
        }
      }
    };

    IntentFilter filter = new IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION);
    try {
      context.registerReceiver(wifiScanReceiver, filter);
    } catch (Exception e) {
      e.printStackTrace();
      return;
    }
    isListening = true;

    // Trigger initial scan
    if (wifiManager != null) {
      wifiManager.startScan();
    }
  }

  @ReactMethod
  public void stopScanning() {
    if (!isListening || wifiScanReceiver == null) {
      return;
    }

    ReactContext context = getReactApplicationContext();
    try {
      context.unregisterReceiver(wifiScanReceiver);
    } catch (IllegalArgumentException e) {
      // Receiver not registered, ignore
    }
    wifiScanReceiver = null;
    isListening = false;
  }

  private WritableArray convertScanResultsToArray(List<ScanResult> results) {
    WritableArray array = Arguments.createArray();

    if (results == null || results.isEmpty()) {
      return array;
    }

    // Sort by RSSI (strongest first, descending)
    Collections.sort(results, new Comparator<ScanResult>() {
      @Override
      public int compare(ScanResult a, ScanResult b) {
        return Integer.compare(b.level, a.level);
      }
    });

    // Remove duplicates (keep strongest BSSID)
    Set<String> seenBssids = new HashSet<>();

    for (ScanResult result : results) {
      if (seenBssids.contains(result.BSSID)) {
        continue;
      }
      seenBssids.add(result.BSSID);

      WritableMap network = Arguments.createMap();
      network.putString("bssid", result.BSSID);
      network.putString("ssid", result.SSID != null && !result.SSID.isEmpty() ? result.SSID : null);
      network.putInt("rssi", result.level);
      network.putInt("frequency", result.frequency);

      array.pushMap(network);
    }

    return array;
  }

  private void sendEvent(ReactContext reactContext, String eventName, @Nullable WritableArray params) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
      .emit(eventName, params);
  }
}