package com.ibnips.kotlinapp.storage

import android.content.Context
import com.ibnips.kotlinapp.domain.model.Fingerprint
import com.ibnips.kotlinapp.domain.model.WifiNetwork
import com.ibnips.kotlinapp.utils.Constants
import com.ibnips.kotlinapp.wifi.WifiResult
import dagger.hilt.android.qualifiers.ApplicationContext
import org.json.JSONArray
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PreferenceManager @Inject constructor(
    @ApplicationContext private val context: Context
) {

    private val preferences = context.getSharedPreferences(
        Constants.Storage.PREFS_NAME,
        Context.MODE_PRIVATE,
    )

    data class StoredLocation(
        val latitude: Double,
        val longitude: Double,
        val accuracy: Float? = null,
        val timestamp: Long,
    ) {
        fun toJson(): JSONObject {
            return JSONObject()
                .put("latitude", latitude)
                .put("longitude", longitude)
                .put("timestamp", timestamp)
                .apply {
                    if (accuracy != null) {
                        put("accuracy", accuracy.toDouble())
                    }
                }
        }

        companion object {
            fun fromJson(json: JSONObject): StoredLocation {
                return StoredLocation(
                    latitude = json.optDouble("latitude", 0.0),
                    longitude = json.optDouble("longitude", 0.0),
                    accuracy = if (json.has("accuracy") && !json.isNull("accuracy")) {
                        json.optDouble("accuracy", 0.0).toFloat()
                    } else {
                        null
                    },
                    timestamp = json.optLong("timestamp", 0L),
                )
            }
        }
    }

    fun isMockModeEnabled(): Boolean = preferences.getBoolean(Constants.Storage.KEY_MOCK_MODE, false)
    fun setMockModeEnabled(enabled: Boolean) = preferences.edit().putBoolean(Constants.Storage.KEY_MOCK_MODE, enabled).apply()

    fun saveLastScan(results: List<WifiResult>) {
        val payload = JSONArray()
        results.forEach { payload.put(it.toJsonObject()) }
        preferences.edit()
            .putString(Constants.Storage.KEY_LAST_SCAN, payload.toString())
            .putLong(Constants.Storage.KEY_LAST_SYNC_TIME, System.currentTimeMillis())
            .apply()
    }

    fun getLastScan(): List<WifiResult> {
        val raw = preferences.getString(Constants.Storage.KEY_LAST_SCAN, null) ?: return emptyList()
        return runCatching {
            val array = JSONArray(raw)
            buildList {
                for (i in 0 until array.length()) {
                    val item = array.optJSONObject(i) ?: continue
                    add(WifiResult.fromJson(item))
                }
            }
        }.getOrElse { emptyList() }
    }

    fun getLastSyncTime(): Long = preferences.getLong(Constants.Storage.KEY_LAST_SYNC_TIME, 0L)

    fun saveFingerprint(fingerprint: Fingerprint) {
        val fingerprints = getFingerprints().toMutableList()
        fingerprints.removeAll { it.roomId == fingerprint.roomId }
        fingerprints.add(fingerprint)
        saveFingerprintList(fingerprints)
    }

    fun deleteFingerprint(roomId: String) {
        val fingerprints = getFingerprints().toMutableList()
        fingerprints.removeAll { it.roomId == roomId }
        saveFingerprintList(fingerprints)
    }

    fun clearAllFingerprints() {
        preferences.edit().remove("key_fingerprints").apply()
    }

    private fun saveFingerprintList(fingerprints: List<Fingerprint>) {
        val array = JSONArray()
        fingerprints.forEach { fp ->
            val obj = JSONObject().apply {
                put("roomId", fp.roomId)
                put("roomName", fp.roomName)
                put("floor", fp.floor)
                put("x", fp.x?.toDouble() ?: JSONObject.NULL)
                put("y", fp.y?.toDouble() ?: JSONObject.NULL)
                put("timestamp", fp.timestamp)
                val wifiArray = JSONArray()
                fp.wifiResults.forEach { net ->
                    wifiArray.put(JSONObject().apply {
                        put("ssid", net.ssid)
                        put("bssid", net.bssid)
                        put("rssi", net.rssi)
                    })
                }
                put("wifiResults", wifiArray)
            }
            array.put(obj)
        }
        preferences.edit().putString("key_fingerprints", array.toString()).apply()
    }

    fun getFingerprints(): List<Fingerprint> {
        val raw = preferences.getString("key_fingerprints", null) ?: return emptyList()
        return runCatching {
            val array = JSONArray(raw)
            buildList {
                for (i in 0 until array.length()) {
                    val obj = array.optJSONObject(i) ?: continue
                    val wifiArray = obj.optJSONArray("wifiResults") ?: JSONArray()
                    val wifiResults = buildList {
                        for (j in 0 until wifiArray.length()) {
                            val w = wifiArray.optJSONObject(j) ?: continue
                            add(WifiNetwork(w.getString("ssid"), w.getString("bssid"), w.getInt("rssi")))
                        }
                    }
                    add(Fingerprint(
                        roomId = obj.getString("roomId"),
                        roomName = obj.getString("roomName"),
                        floor = obj.getInt("floor"),
                        x = if (obj.has("x") && !obj.isNull("x")) obj.getDouble("x").toFloat() else null,
                        y = if (obj.has("y") && !obj.isNull("y")) obj.getDouble("y").toFloat() else null,
                        wifiResults = wifiResults,
                        timestamp = obj.getLong("timestamp")
                    ))
                }
            }
        }.getOrElse { emptyList() }
    }

    fun saveLastLocation(latitude: Double, longitude: Double, accuracy: Float? = null, timestamp: Long = System.currentTimeMillis()) {
        val snapshot = StoredLocation(latitude, longitude, accuracy, timestamp)
        preferences.edit().putString(Constants.Storage.KEY_LAST_LOCATION, snapshot.toJson().toString()).apply()
    }

    fun getLastLocation(): StoredLocation? {
        val raw = preferences.getString(Constants.Storage.KEY_LAST_LOCATION, null) ?: return null
        return runCatching { StoredLocation.fromJson(JSONObject(raw)) }.getOrNull()
    }

    fun getUserSettings(): JSONObject {
        val raw = preferences.getString(Constants.Storage.KEY_USER_SETTINGS, "{}")
        return runCatching { JSONObject(raw) }.getOrDefault(JSONObject("{}"))
    }

    fun saveUserSettings(settings: JSONObject) {
        preferences.edit().putString(Constants.Storage.KEY_USER_SETTINGS, settings.toString()).apply()
    }

    fun putUserSetting(key: String, value: Any?) {
        val json = getUserSettings()
        when (value) {
            is Boolean -> json.put(key, value)
            is Int -> json.put(key, value)
            is Long -> json.put(key, value)
            is Double -> json.put(key, value)
            is Float -> json.put(key, value.toDouble())
            else -> json.put(key, value.toString())
        }
        saveUserSettings(json)
    }

    fun getString(key: String, defaultValue: String?): String? = preferences.getString(key, defaultValue)
    fun saveString(key: String, value: String?) = preferences.edit().putString(key, value).apply()

    fun saveApiBaseUrl(url: String) = preferences.edit().putString(Constants.Storage.KEY_API_BASE_URL, url.trim()).apply()
    fun getApiBaseUrl(): String = preferences.getString(Constants.Storage.KEY_API_BASE_URL, Constants.Api.DEFAULT_BASE_URL) ?: Constants.Api.DEFAULT_BASE_URL

    fun getAuthToken(): String? = preferences.getString("key_auth_token", null)
    fun saveAuthToken(token: String) = preferences.edit().putString("key_auth_token", token).apply()

    fun getUserEmail(): String = preferences.getString("key_user_email", "user@kiit.ac.in") ?: "user@kiit.ac.in"
    fun saveUserEmail(email: String) = preferences.edit().putString("key_user_email", email).apply()

    fun getLastNodeId(): String = preferences.getString("key_last_node_id", "") ?: ""
    fun saveLastNodeId(nodeId: String) = preferences.edit().putString("key_last_node_id", nodeId).apply()

    fun clearAll() {
        preferences.edit().clear().apply()
    }
}
