package com.ibnips.kotlinapp.wifi

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.wifi.ScanResult
import android.net.wifi.WifiManager
import android.os.SystemClock
import com.ibnips.kotlinapp.permissions.PermissionManager
import com.ibnips.kotlinapp.utils.Constants
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.coroutines.resume

class WifiScanner(private val context: Context) {
    private val appContext: Context = context.applicationContext

    sealed class WifiScanOutcome {
        data class Success(val results: List<WifiResult>, val fromCache: Boolean = false) : WifiScanOutcome()
        data class Failure(
            val reason: WifiScanFailureReason,
            val message: String,
            val cachedResults: List<WifiResult> = emptyList(),
            val throwable: Throwable? = null
        ) : WifiScanOutcome()
    }

    enum class WifiScanFailureReason {
        WIFI_MANAGER_UNAVAILABLE, PERMISSION_DENIED, WIFI_DISABLED, LOCATION_DISABLED, SCAN_THROTTLED, START_SCAN_FAILED, TIMEOUT, SECURITY_EXCEPTION, CANCELLED, UNKNOWN
    }

    suspend fun scanNearbyNetworks(forceRefresh: Boolean = true): WifiScanOutcome = withContext(Dispatchers.IO) {
        val validationFailure = validateScanPrerequisites()
        if (validationFailure != null) return@withContext validationFailure

        val wifiManager = getWifiManager() ?: return@withContext WifiScanOutcome.Failure(WifiScanFailureReason.WIFI_MANAGER_UNAVAILABLE, "WifiManager missing")

        if (forceRefresh) {
            val timeoutMs = Constants.Wifi.SCAN_TIMEOUT_MS
            val scanOutcome = withTimeoutOrNull(timeoutMs) { performLiveScan(wifiManager) }
            // If live scan timed out, return failure with cache but mark it as failure
            scanOutcome ?: WifiScanOutcome.Failure(
                reason = WifiScanFailureReason.TIMEOUT,
                message = "Live scan timed out",
                cachedResults = readSystemScanResults()
            )
        } else {
            WifiScanOutcome.Success(readSystemScanResults(), fromCache = true)
        }
    }

    fun getCachedScanResults(): List<WifiResult> = readSystemScanResults()

    private suspend fun performLiveScan(wifiManager: WifiManager): WifiScanOutcome = suspendCancellableCoroutine { continuation ->
        val hasResumed = AtomicBoolean(false)
        var receiver: BroadcastReceiver? = null

        fun resumeOnce(outcome: WifiScanOutcome) {
            if (hasResumed.compareAndSet(false, true)) {
                receiver?.let { runCatching { appContext.unregisterReceiver(it) } }
                if (continuation.isActive) continuation.resume(outcome)
            }
        }

        receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                // Requirement: Only consider scan successful if system actually refreshed data
                val updated = intent?.getBooleanExtra(WifiManager.EXTRA_RESULTS_UPDATED, false) ?: false
                if (updated) {
                    resumeOnce(WifiScanOutcome.Success(readSystemScanResults(), fromCache = false))
                } else {
                    // System was throttled, returned stale data
                    resumeOnce(WifiScanOutcome.Failure(
                        reason = WifiScanFailureReason.SCAN_THROTTLED,
                        message = "Android system returned cached results (Throttled)",
                        cachedResults = readSystemScanResults()
                    ))
                }
            }
        }

        appContext.registerReceiver(receiver, IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION))
        
        val started = runCatching { wifiManager.startScan() }.getOrDefault(false)
        if (!started) {
            // Immediate throttle
            resumeOnce(WifiScanOutcome.Failure(
                reason = WifiScanFailureReason.SCAN_THROTTLED,
                message = "Scan request rejected by system",
                cachedResults = readSystemScanResults()
            ))
        }
    }

    private fun validateScanPrerequisites(): WifiScanOutcome.Failure? {
        if (!PermissionManager.hasRequiredPermissions(appContext)) return WifiScanOutcome.Failure(WifiScanFailureReason.PERMISSION_DENIED, "Permissions missing")
        if (!PermissionManager.isLocationServicesEnabled(appContext)) return WifiScanOutcome.Failure(WifiScanFailureReason.LOCATION_DISABLED, "Location disabled")
        return null
    }

    private fun readSystemScanResults(): List<WifiResult> {
        val wifiManager = getWifiManager() ?: return emptyList()
        return try {
            @Suppress("MissingPermission")
            val results = wifiManager.scanResults
            val nowMs = System.currentTimeMillis()
            val bootTimeMs = SystemClock.elapsedRealtime()
            
            results.map { 
                // Hardware timestamp sync: convert microseconds since boot to wall clock millis
                val ageMs = bootTimeMs - (it.timestamp / 1000)
                val actualTimestamp = nowMs - ageMs
                it.toWifiResult(actualTimestamp) 
            }
            .distinctBy { it.bssid }
            .sortedByDescending { it.rssi }
            .take(Constants.Wifi.MAX_RESULTS_LIMIT)
        } catch (e: Exception) { emptyList() }
    }

    private fun getWifiManager(): WifiManager? = appContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
    private fun ScanResult.toWifiResult(timestamp: Long): WifiResult = WifiResult.fromScanResult(this, timestamp)
}
