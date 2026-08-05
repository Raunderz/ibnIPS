package com.ibnips.kotlinapp.wifi

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.wifi.ScanResult
import android.net.wifi.WifiManager
import com.ibnips.kotlinapp.permissions.PermissionManager
import com.ibnips.kotlinapp.utils.Constants
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.coroutines.resume

/**
 * Production-ready Wi-Fi scanner for the Android native layer.
 */
class WifiScanner(private val context: Context) {

    private val appContext: Context = context.applicationContext

    sealed class WifiScanOutcome {
        data class Success(
            val results: List<WifiResult>,
            val fromCache: Boolean = false,
        ) : WifiScanOutcome()

        data class Failure(
            val reason: WifiScanFailureReason,
            val message: String,
            val cachedResults: List<WifiResult> = emptyList(),
            val throwable: Throwable? = null,
        ) : WifiScanOutcome()
    }

    enum class WifiScanFailureReason {
        WIFI_MANAGER_UNAVAILABLE,
        PERMISSION_DENIED,
        WIFI_DISABLED,
        LOCATION_DISABLED,
        SCAN_THROTTLED,
        START_SCAN_FAILED,
        TIMEOUT,
        SECURITY_EXCEPTION,
        CANCELLED,
        UNKNOWN,
    }

    suspend fun scanNearbyNetworks(forceRefresh: Boolean = true): WifiScanOutcome {
        return withContext(Dispatchers.IO) {
            val validationFailure = validateScanPrerequisites()
            if (validationFailure != null) {
                return@withContext validationFailure
            }

            if (!forceRefresh) {
                return@withContext WifiScanOutcome.Success(
                    results = getCachedScanResults(),
                    fromCache = true,
                )
            }

            val timeoutMs = Constants.Wifi.SCAN_TIMEOUT_MS
            val scanOutcome = withTimeoutOrNull(timeoutMs) {
                performLiveScan()
            }

            scanOutcome ?: WifiScanOutcome.Failure(
                reason = WifiScanFailureReason.TIMEOUT,
                message = "Wi-Fi scan timed out after ${timeoutMs}ms.",
                cachedResults = getCachedScanResults(),
            )
        }
    }

    fun getCachedScanResults(): List<WifiResult> {
        return runCatching {
            readSystemScanResults()
        }.getOrElse {
            emptyList()
        }
    }

    fun canScanNow(): Boolean {
        val wifiManager = getWifiManager() ?: return false
        return PermissionManager.hasRequiredPermissions(appContext) &&
            PermissionManager.isLocationServicesEnabled(appContext) &&
            isWifiEnabledOrScanAvailable(wifiManager)
    }

    private suspend fun performLiveScan(): WifiScanOutcome {
        val wifiManager = getWifiManager()
            ?: return WifiScanOutcome.Failure(
                reason = WifiScanFailureReason.WIFI_MANAGER_UNAVAILABLE,
                message = "Wi-Fi service is unavailable on this device.",
            )

        return suspendCancellableCoroutine { continuation ->
            val hasResumed = AtomicBoolean(false)
            var receiver: BroadcastReceiver? = null

            fun cleanup() {
                receiver?.let {
                    runCatching { appContext.unregisterReceiver(it) }
                    receiver = null
                }
            }

            fun resumeOnce(outcome: WifiScanOutcome) {
                if (hasResumed.compareAndSet(false, true)) {
                    cleanup()
                    if (continuation.isActive) {
                        continuation.resume(outcome)
                    }
                }
            }

            receiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    val updated = intent?.getBooleanExtra(
                        WifiManager.EXTRA_RESULTS_UPDATED,
                        false,
                    ) ?: false

                    if (updated) {
                        resumeOnce(
                            WifiScanOutcome.Success(
                                results = readSystemScanResults(),
                                fromCache = false,
                            ),
                        )
                    } else {
                        resumeOnce(
                            WifiScanOutcome.Failure(
                                reason = WifiScanFailureReason.SCAN_THROTTLED,
                                message = "Wi-Fi scan completed, but the system reported no updated results.",
                                cachedResults = getCachedScanResults(),
                            ),
                        )
                    }
                }
            }

            continuation.invokeOnCancellation {
                cleanup()
            }

            try {
                @Suppress("DEPRECATION")
                appContext.registerReceiver(
                    receiver,
                    IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION),
                )

                val started = runCatching { wifiManager.startScan() }
                    .getOrElse { throwable ->
                        resumeOnce(mapThrowableToFailure(throwable))
                        return@suspendCancellableCoroutine
                    }

                if (!started) {
                    resumeOnce(
                        WifiScanOutcome.Failure(
                            reason = WifiScanFailureReason.START_SCAN_FAILED,
                            message = "Wi-Fi scan request was rejected by the platform.",
                            cachedResults = getCachedScanResults(),
                        ),
                    )
                }
            } catch (throwable: Throwable) {
                resumeOnce(mapThrowableToFailure(throwable))
            }
        }
    }

    private fun validateScanPrerequisites(): WifiScanOutcome.Failure? {
        val wifiManager = getWifiManager()
            ?: return WifiScanOutcome.Failure(
                reason = WifiScanFailureReason.WIFI_MANAGER_UNAVAILABLE,
                message = "Wi-Fi service is unavailable on this device.",
            )

        if (!PermissionManager.hasRequiredPermissions(appContext)) {
            return WifiScanOutcome.Failure(
                reason = WifiScanFailureReason.PERMISSION_DENIED,
                message = "Required runtime permissions are missing for Wi-Fi scanning.",
            )
        }

        if (!PermissionManager.isLocationServicesEnabled(appContext)) {
            return WifiScanOutcome.Failure(
                reason = WifiScanFailureReason.LOCATION_DISABLED,
                message = "Location services are disabled, so Wi-Fi scan results are unavailable.",
            )
        }

        if (!isWifiEnabledOrScanAvailable(wifiManager)) {
            return WifiScanOutcome.Failure(
                reason = WifiScanFailureReason.WIFI_DISABLED,
                message = "Wi-Fi is disabled and scan mode is not available.",
            )
        }

        return null
    }

    private fun readSystemScanResults(): List<WifiResult> {
        val wifiManager = getWifiManager()
            ?: return emptyList()

        return runCatching {
            @Suppress("MissingPermission")
            val now = System.currentTimeMillis()
            wifiManager.scanResults
                .asSequence()
                .map { scanResult -> scanResult.toWifiResult(now) }
                .filter { it.isValid }
                .distinctBy { it.bssid }
                .sortedByDescending { it.rssi }
                .take(Constants.Wifi.MAX_RESULTS_LIMIT)
                .toList()
        }.getOrElse {
            emptyList()
        }
    }

    private fun isWifiEnabledOrScanAvailable(wifiManager: WifiManager): Boolean {
        @Suppress("DEPRECATION")
        val enabled = wifiManager.isWifiEnabled
        return enabled || wifiManager.isScanAlwaysAvailable
    }

    private fun getWifiManager(): WifiManager? {
        return appContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
    }

    private fun mapThrowableToFailure(throwable: Throwable): WifiScanOutcome.Failure {
        return when (throwable) {
            is SecurityException -> WifiScanOutcome.Failure(
                reason = WifiScanFailureReason.SECURITY_EXCEPTION,
                message = "Wi-Fi scan failed because the app does not hold the required permission.",
                cachedResults = getCachedScanResults(),
                throwable = throwable,
            )
            is CancellationException -> WifiScanOutcome.Failure(
                reason = WifiScanFailureReason.CANCELLED,
                message = "Wi-Fi scan was cancelled.",
                cachedResults = getCachedScanResults(),
                throwable = throwable,
            )
            else -> WifiScanOutcome.Failure(
                reason = WifiScanFailureReason.UNKNOWN,
                message = throwable.message ?: "Unexpected Wi-Fi scan failure.",
                cachedResults = getCachedScanResults(),
                throwable = throwable,
            )
        }
    }

    private fun ScanResult.toWifiResult(timestamp: Long): WifiResult {
        return WifiResult.fromScanResult(this, timestamp)
    }
}
