package com.ibnips.app.data.wifi

import android.Manifest
import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.wifi.WifiManager
import android.os.Build
import androidx.core.content.ContextCompat
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class AndroidWifiScanner(context: Context) : WifiScanner {
    private val appContext = context.applicationContext
    private val wifiManager = appContext.getSystemService(Context.WIFI_SERVICE) as WifiManager

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

    // Android 13+ will not return scan results without NEARBY_WIFI_DEVICES, and
    // earlier releases need location permission for the same data. Checked up
    // front rather than letting the API throw SecurityException and treating
    // the crash as control flow.
    private fun hasScanPermission(): Boolean =
        requiredPermissions().any {
            ContextCompat.checkSelfPermission(appContext, it) == PackageManager.PERMISSION_GRANTED
        }

    override fun startScan() {
        try {
            if (!hasScanPermission()) {
                _scanState.value = WifiScanState.PERMISSION_DENIED
                return
            }

            _scanState.value = WifiScanState.SCANNING

            // Registered against the application context, so the receiver cannot
            // outlive the Activity that created the scanner.
            if (!isReceiverRegistered) {
                val intentFilter = IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION)
                appContext.registerReceiver(wifiScanReceiver, intentFilter)
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
                appContext.unregisterReceiver(wifiScanReceiver)
                isReceiverRegistered = false
            }
        } catch (e: Exception) {
            // Ignore unregister errors
        }
        _scanState.value = WifiScanState.IDLE
    }

    @SuppressLint("MissingPermission")
    private fun scanSuccess() {
        if (!hasScanPermission()) {
            _scanState.value = WifiScanState.PERMISSION_DENIED
            return
        }

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

    companion object {
        // The permissions a Wi-Fi scan needs on this Android version. Public so
        // the UI can ask for them: without a grant, `scanResults` throws and
        // positioning silently never works.
        fun requiredPermissions(): Array<String> =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                arrayOf(
                    Manifest.permission.NEARBY_WIFI_DEVICES,
                    Manifest.permission.ACCESS_FINE_LOCATION
                )
            } else {
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
            }
    }
}
