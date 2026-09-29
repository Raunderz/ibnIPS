package com.ibnips.app.data.wifi

import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.wifi.WifiManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class AndroidWifiScanner(private val context: Context) : WifiScanner {
    private val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager

    private val _scanState = MutableStateFlow(WifiScanState.IDLE)
    override val scanState: StateFlow<WifiScanState> = _scanState.asStateFlow()

    private val _scanResults = MutableStateFlow<List<WifiScanResult>>(emptyList())
    override val scanResults: StateFlow<List<WifiScanResult>> = _scanResults.asStateFlow()

    private var isReceiverRegistered = false

    private val wifiScanReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            // We check for results updated but even if false, we might have old results
            scanSuccess()
        }
    }

    override fun startScan() {
        try {
            _scanState.value = WifiScanState.SCANNING
            
            if (!isReceiverRegistered) {
                val intentFilter = IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION)
                context.registerReceiver(wifiScanReceiver, intentFilter)
                isReceiverRegistered = true
            }

            @Suppress("DEPRECATION")
            val success = wifiManager.startScan()
            if (!success) {
                // If startScan returns false, it means the request was throttled
                // or the scanner is not ready. We can still try to read the last results.
                scanSuccess()
            }
        } catch (e: SecurityException) {
            _scanState.value = WifiScanState.PERMISSION_DENIED
        } catch (e: Exception) {
            _scanState.value = WifiScanState.ERROR
        }
    }

    override fun stopScan() {
        try {
            if (isReceiverRegistered) {
                context.unregisterReceiver(wifiScanReceiver)
                isReceiverRegistered = false
            }
        } catch (e: Exception) {
            // Ignore unregister errors
        }
        _scanState.value = WifiScanState.IDLE
    }

    @SuppressLint("MissingPermission")
    private fun scanSuccess() {
        try {
            val results = wifiManager.scanResults
            if (results.isNullOrEmpty()) {
                _scanState.value = WifiScanState.NO_RESULTS
                _scanResults.value = emptyList()
            } else {
                val mappedResults = results.map {
                    WifiScanResult(
                        ssid = it.SSID ?: "",
                        bssid = it.BSSID ?: "",
                        rssi = it.level,
                        frequency = it.frequency,
                        timestamp = System.currentTimeMillis()
                    )
                }
                _scanResults.value = mappedResults
                _scanState.value = WifiScanState.SUCCESS
            }
        } catch (e: SecurityException) {
            _scanState.value = WifiScanState.PERMISSION_DENIED
        } catch (e: Exception) {
            _scanState.value = WifiScanState.ERROR
        }
    }

    override fun getLatestResults(): List<WifiScanResult> {
        return _scanResults.value
    }
}
