package com.ibnips.kotlinapp.wifi

import android.net.wifi.ScanResult
import org.json.JSONObject

/**
 * Immutable Wi-Fi scan result shared across the native layer.
 *
 * This is the canonical data shape used by:
 * - WifiScanner
 * - MockDataProvider
 * - PreferenceManager
 * - Repository
 * - React Native bridge JSON responses
 */
data class WifiResult(
    val ssid: String,
    val bssid: String,
    val rssi: Int,
    val frequency: Int,
    val timestamp: Long,
) {

    /**
     * True when the scan result contains a usable network identity.
     */
    val isValid: Boolean
        get() = ssid.isNotBlank() && bssid.isNotBlank()

    /**
     * Returns a stable, JSON-safe representation for the React Native bridge.
     * The bridge can send this object list straight into JS after wrapping in a JSONArray.
     */
    fun toJsonObject(): JSONObject {
        return JSONObject()
            .put(KEY_SSID, ssid)
            .put(KEY_BSSID, bssid)
            .put(KEY_RSSI, rssi)
            .put(KEY_FREQUENCY, frequency)
            .put(KEY_TIMESTAMP, timestamp)
    }

    /**
     * Compact map form for local storage or repository conversions.
     */
    fun toMap(): Map<String, Any> {
        return linkedMapOf(
            KEY_SSID to ssid,
            KEY_BSSID to bssid,
            KEY_RSSI to rssi,
            KEY_FREQUENCY to frequency,
            KEY_TIMESTAMP to timestamp,
        )
    }

    companion object {
        const val KEY_SSID = "ssid"
        const val KEY_BSSID = "bssid"
        const val KEY_RSSI = "rssi"
        const val KEY_FREQUENCY = "frequency"
        const val KEY_TIMESTAMP = "timestamp"

        /**
         * Convert an Android framework scan result into the app's normalized model.
         * If the scan result contains hidden or placeholder values, they are normalized.
         */
        fun fromScanResult(scanResult: ScanResult, timestamp: Long = System.currentTimeMillis()): WifiResult {
            return WifiResult(
                ssid = normalizeSsid(scanResult.SSID),
                bssid = normalizeBssid(scanResult.BSSID),
                rssi = scanResult.level,
                frequency = scanResult.frequency,
                timestamp = timestamp,
            )
        }

        /**
         * Convert a JSON object back into a strongly-typed model.
         * This is useful for reading cached scans or bridge payloads.
         */
        fun fromJson(json: JSONObject): WifiResult {
            return WifiResult(
                ssid = json.optString(KEY_SSID, ""),
                bssid = json.optString(KEY_BSSID, ""),
                rssi = json.optInt(KEY_RSSI, Int.MIN_VALUE),
                frequency = json.optInt(KEY_FREQUENCY, 0),
                timestamp = json.optLong(KEY_TIMESTAMP, 0L),
            )
        }

        fun empty(): WifiResult {
            return WifiResult(
                ssid = "",
                bssid = "",
                rssi = Int.MIN_VALUE,
                frequency = 0,
                timestamp = 0L,
            )
        }

        private fun normalizeSsid(raw: String?): String {
            val value = raw.orEmpty().trim()
            return when (value) {
                "", "<unknown ssid>" -> ""
                else -> value
            }
        }

        private fun normalizeBssid(raw: String?): String {
            return raw.orEmpty().trim()
        }
    }
}

