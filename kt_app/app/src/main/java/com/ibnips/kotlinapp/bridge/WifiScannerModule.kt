package com.ibnips.kotlinapp.bridge

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.ibnips.kotlinapp.wifi.WifiResult
import com.ibnips.kotlinapp.wifi.WifiScanner
import kotlinx.coroutines.*

/**
 * React Native Bridge for the production-ready WifiScanner.
 * 
 * This module acts as a pure bridge layer, delegating all scanning logic to
 * the native WifiScanner class while ensuring safe asynchronous execution
 * and data conversion for the React Native layer.
 */
class WifiScannerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val wifiScanner = WifiScanner(reactContext)
    
    // Requirement 1: Background scope for I/O bound scanning work
    private val moduleScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun getName(): String = "WifiScannerModule"

    /**
     * Triggers a live Wi-Fi scan and emits results via DeviceEventEmitter.
     * Also returns the results via Promise for one-shot consumption.
     */
    @Suppress("unused")
    @ReactMethod
    fun requestScan(promise: Promise) {
        moduleScope.launch {
            try {
                // Requirement 4: Explicitly use IO dispatcher for the suspend call
                val outcome = withContext(Dispatchers.IO) {
                    wifiScanner.scanNearbyNetworks(forceRefresh = true)
                }
                
                // Requirement 4: Switch back to Main for Promise and EventEmitter interaction
                withContext(Dispatchers.Main) {
                    handleOutcome(outcome, promise)
                }
            } catch (e: SecurityException) {
                promise.reject("SECURITY_EXCEPTION", e.message, e)
            } catch (e: CancellationException) {
                promise.reject("CANCELLED", "Scan operation was cancelled", e)
            } catch (e: IllegalStateException) {
                promise.reject("ILLEGAL_STATE", e.message, e)
            } catch (e: Exception) {
                promise.reject("SCAN_EXCEPTION", e.message, e)
            }
        }
    }

    /**
     * Returns the latest cached scan results immediately.
     */
    @Suppress("unused")
    @ReactMethod
    fun getCachedResults(promise: Promise) {
        val results = wifiScanner.getCachedScanResults()
        promise.resolve(mapResultsToArray(results))
    }

    /**
     * Processes the scan outcome and manages bridge communication.
     */
    private fun handleOutcome(outcome: WifiScanner.WifiScanOutcome, promise: Promise) {
        when (outcome) {
            is WifiScanner.WifiScanOutcome.Success -> {
                val writableArray = mapResultsToArray(outcome.results)
                
                // 1. Emit event to JS listeners (Requirement 7: wifiScansReceived)
                sendEvent("wifiScansReceived", writableArray)
                
                // 2. Resolve the promise
                promise.resolve(writableArray)
            }
            is WifiScanner.WifiScanOutcome.Failure -> {
                // Requirement 2: Emit cached results if available before rejection
                if (outcome.cachedResults.isNotEmpty()) {
                    val cachedArray = mapResultsToArray(outcome.cachedResults)
                    sendEvent("wifiScansReceived", cachedArray)
                }
                
                // Reject promise with failure details from the scanner
                promise.reject(outcome.reason.name, outcome.message, outcome.throwable)
            }
        }
    }

    /**
     * Converts native result models to bridge-compatible data structures.
     */
    private fun mapResultsToArray(results: List<WifiResult>): WritableArray {
        val array = Arguments.createArray()
        for (result in results) {
            val map = Arguments.createMap().apply {
                putString("ssid", result.ssid)
                putString("bssid", result.bssid)
                putInt("rssi", result.rssi)
                putInt("frequency", result.frequency)
                putDouble("timestamp", result.timestamp.toDouble())
            }
            array.pushMap(map)
        }
        return array
    }

    /**
     * Helper to emit events to the React Native event emitter.
     */
    private fun sendEvent(eventName: String, params: WritableArray) {
        // Use hasCatalystInstance() as a modern alternative to check if emitting is safe
        if (reactApplicationContext.hasCatalystInstance()) {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        }
    }

    /**
     * Requirement 3: Cleanup scope on invalidation to prevent memory leaks.
     * This is the preferred lifecycle method for cleanup in modern React Native.
     */
    override fun invalidate() {
        moduleScope.cancel()
        super.invalidate()
    }
}
