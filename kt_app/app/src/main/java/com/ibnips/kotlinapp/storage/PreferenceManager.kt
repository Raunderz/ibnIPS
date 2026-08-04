package com.ibnips.kotlinapp.storage

import android.content.Context
import android.content.SharedPreferences
import com.ibnips.kotlinapp.utils.Constants
import com.ibnips.kotlinapp.wifi.WifiResult
import org.json.JSONArray
import org.json.JSONObject

/**
 * SharedPreferences-backed persistence layer for the Android native module.
 *
 * Responsibilities:
 * - store and read mock mode state
 * - persist user settings safely as JSON
 * - cache the last Wi-Fi scan result list
 * - cache the last known location snapshot
 * - store lightweight preferences needed by the service and bridge
 * - keep all keys centralized through Constants
 *
 * This class intentionally avoids UI concerns and can be used by:
 * - WifiBridgeModule
 * - PositionService
 * - Repository
 * - MockDataProvider
 */
class PreferenceManager(context: Context) {

    private val appContext = context.applicationContext
    private val preferences: SharedPreferences = appContext.getSharedPreferences(
        Constants.Storage.PREFS_NAME,
        Context.MODE_PRIVATE,
    )

    /**
     * Lightweight representation of the last stored location snapshot.
     */
    data class StoredLocation(
        val latitude: Double,
        val longitude: Double,
        val accuracy: Float? = null,
        val timestamp: Long,
    ) {
        fun toJson(): JSONObject {
            return JSONObject()
                .put(KEY_LATITUDE, latitude)
                .put(KEY_LONGITUDE, longitude)
                .put(KEY_TIMESTAMP, timestamp)
                .apply {
                    if (accuracy != null) {
                        put(KEY_ACCURACY, accuracy.toDouble())
                    }
                }
        }

        companion object {
            fun fromJson(json: JSONObject): StoredLocation {
                return StoredLocation(
                    latitude = json.optDouble(KEY_LATITUDE, 0.0),
                    longitude = json.optDouble(KEY_LONGITUDE, 0.0),
                    accuracy = if (json.has(KEY_ACCURACY) && !json.isNull(KEY_ACCURACY)) {
                        json.optDouble(KEY_ACCURACY, 0.0).toFloat()
                    } else {
                        null
                    },
                    timestamp = json.optLong(KEY_TIMESTAMP, 0L),
                )
            }
        }
    }

    fun isMockModeEnabled(): Boolean {
        return preferences.getBoolean(Constants.Storage.KEY_MOCK_MODE, false)
    }

    fun setMockModeEnabled(enabled: Boolean) {
        preferences.edit().putBoolean(Constants.Storage.KEY_MOCK_MODE, enabled).apply()
    }

    fun saveUserSettings(settings: JSONObject) {
        preferences.edit()
            .putString(Constants.Storage.KEY_USER_SETTINGS, settings.toString())
            .apply()
    }

    fun saveUserSettings(settings: Map<String, Any?>) {
        val json = JSONObject()
        settings.forEach { (key, value) ->
            putJsonValue(json, key, value)
        }
        saveUserSettings(json)
    }

    fun getUserSettings(): JSONObject {
        val raw = preferences.getString(Constants.Storage.KEY_USER_SETTINGS, null)
        return if (raw.isNullOrBlank()) {
            JSONObject()
        } else {
            runCatching { JSONObject(raw) }.getOrElse { JSONObject() }
        }
    }

    fun getUserSetting(key: String, defaultValue: String = ""): String {
        return getUserSettings().optString(key, defaultValue)
    }

    fun putUserSetting(key: String, value: Any?) {
        val json = getUserSettings()
        putJsonValue(json, key, value)
        saveUserSettings(json)
    }

    fun saveLastScan(results: List<WifiResult>) {
        val payload = JSONArray()
        results.forEach { result ->
            payload.put(result.toJsonObject())
        }

        preferences.edit()
            .putString(Constants.Storage.KEY_LAST_SCAN, payload.toString())
            .putLong(Constants.Storage.KEY_LAST_SYNC_TIME, System.currentTimeMillis())
            .apply()
    }

    fun getLastScan(): List<WifiResult> {
        val raw = preferences.getString(Constants.Storage.KEY_LAST_SCAN, null)
            ?: return emptyList()

        return runCatching {
            val array = JSONArray(raw)
            buildList {
                for (index in 0 until array.length()) {
                    val item = array.optJSONObject(index) ?: continue
                    add(WifiResult.fromJson(item))
                }
            }
        }.getOrElse {
            emptyList()
        }
    }

    fun clearLastScan() {
        preferences.edit()
            .remove(Constants.Storage.KEY_LAST_SCAN)
            .remove(Constants.Storage.KEY_LAST_SYNC_TIME)
            .apply()
    }

    fun getLastScanTimestamp(): Long {
        return preferences.getLong(Constants.Storage.KEY_LAST_SYNC_TIME, 0L)
    }

    fun saveLastLocation(
        latitude: Double,
        longitude: Double,
        accuracy: Float? = null,
        timestamp: Long = System.currentTimeMillis(),
    ) {
        val snapshot = StoredLocation(
            latitude = latitude,
            longitude = longitude,
            accuracy = accuracy,
            timestamp = timestamp,
        )

        preferences.edit()
            .putString(Constants.Storage.KEY_LAST_LOCATION, snapshot.toJson().toString())
            .apply()
    }

    fun getLastLocation(): StoredLocation? {
        val raw = preferences.getString(Constants.Storage.KEY_LAST_LOCATION, null)
            ?: return null

        return runCatching { StoredLocation.fromJson(JSONObject(raw)) }
            .getOrNull()
    }

    fun clearLastLocation() {
        preferences.edit()
            .remove(Constants.Storage.KEY_LAST_LOCATION)
            .apply()
    }

    fun saveApiBaseUrl(baseUrl: String) {
        preferences.edit()
            .putString(Constants.Storage.KEY_API_BASE_URL, baseUrl.trim())
            .apply()
    }

    fun getApiBaseUrl(): String {
        return preferences.getString(Constants.Storage.KEY_API_BASE_URL, Constants.Api.DEFAULT_BASE_URL)
            ?: Constants.Api.DEFAULT_BASE_URL
    }

    fun saveString(key: String, value: String?) {
        preferences.edit().putString(key, value).apply()
    }

    fun getString(key: String, defaultValue: String? = null): String? {
        return preferences.getString(key, defaultValue)
    }

    fun saveBoolean(key: String, value: Boolean) {
        preferences.edit().putBoolean(key, value).apply()
    }

    fun getBoolean(key: String, defaultValue: Boolean = false): Boolean {
        return preferences.getBoolean(key, defaultValue)
    }

    fun saveLong(key: String, value: Long) {
        preferences.edit().putLong(key, value).apply()
    }

    fun getLong(key: String, defaultValue: Long = 0L): Long {
        return preferences.getLong(key, defaultValue)
    }

    fun saveInt(key: String, value: Int) {
        preferences.edit().putInt(key, value).apply()
    }

    fun getInt(key: String, defaultValue: Int = 0): Int {
        return preferences.getInt(key, defaultValue)
    }

    fun remove(key: String) {
        preferences.edit().remove(key).apply()
    }

    fun clearAll() {
        preferences.edit().clear().apply()
    }

    fun contains(key: String): Boolean {
        return preferences.contains(key)
    }

    fun getLastSyncTime(): Long {
        return preferences.getLong(Constants.Storage.KEY_LAST_SYNC_TIME, 0L)
    }

    private fun putJsonValue(json: JSONObject, key: String, value: Any?) {
        when (value) {
            null -> json.put(key, JSONObject.NULL)
            is Boolean -> json.put(key, value)
            is Int -> json.put(key, value)
            is Long -> json.put(key, value)
            is Float -> json.put(key, value.toDouble())
            is Double -> json.put(key, value)
            is Number -> json.put(key, value)
            is String -> json.put(key, value)
            is JSONObject -> json.put(key, value)
            is JSONArray -> json.put(key, value)
            is Map<*, *> -> json.put(key, JSONObject(value))
            is Iterable<*> -> json.put(key, JSONArray(value))
            else -> json.put(key, value.toString())
        }
    }

    companion object {
        private const val KEY_LATITUDE = "latitude"
        private const val KEY_LONGITUDE = "longitude"
        private const val KEY_ACCURACY = "accuracy"
        private const val KEY_TIMESTAMP = "timestamp"
    }
}

