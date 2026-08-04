package com.raunderz.icps

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.wifi.ScanResult
import android.net.wifi.WifiManager
import android.os.Build
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class WifiScannerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val wifiManager = reactContext.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
    private var receiver: BroadcastReceiver? = null

    override fun getName(): String {
        return "WifiScannerModule"
    }

    @ReactMethod
    fun startListening() {
        if (receiver != null) return

        val context = reactApplicationContext
        receiver = object : BroadcastReceiver() {
            override fun onReceive(c: Context, intent: Intent) {
                sendScanResults()
            }
        }

        val filter = IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION)
        
        // Android 14 (API 34) requires RECEIVER_EXPORTED or RECEIVER_NOT_EXPORTED for dynamic receivers
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            context.registerReceiver(receiver, filter)
        }

        // Send initial results immediately
        sendScanResults()
    }

    @ReactMethod
    fun stopListening() {
        receiver?.let {
            reactApplicationContext.unregisterReceiver(it)
            receiver = null
        }
    }

    private fun sendScanResults() {
        try {
            val scanResults: List<ScanResult> = wifiManager.scanResults
            val array = Arguments.createArray()
            val seenBssids = mutableSetOf<String>()

            for (result in scanResults) {
                val bssid = result.BSSID ?: continue
                if (seenBssids.contains(bssid)) continue
                seenBssids.add(bssid)

                val map = Arguments.createMap()
                map.putString("bssid", bssid)
                
                // Read SSID. In newer Android APIs, use wifiSsid if available
                val ssid = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    result.wifiSsid?.toString() ?: result.SSID
                } else {
                    result.SSID
                }
                map.putString("ssid", ssid ?: "")
                map.putInt("rssi", result.level)
                map.putInt("frequency", result.frequency)
                array.pushMap(map)
            }

            val event = Arguments.createMap()
            event.putArray("scans", array)

            if (reactApplicationContext.hasActiveReactInstance()) {
                reactApplicationContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("wifiScansReceived", event)
            }
        } catch (e: SecurityException) {
            // Location permission not granted yet - silently fail
        } catch (e: Exception) {
            // Fallback for other unexpected errors
        }
    }
}
