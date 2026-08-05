package com.ibnips.kotlinapp.utils

import android.Manifest
import android.os.Build

/**
 * Centralized app constants for the native Android layer.
 */
object Constants {

    object App {
        const val TAG = "IbnIPS"
        const val APP_NAME = "ibnIPS"
        const val VERSION_NAME = "0.1.0"
    }

    object Permissions {
        const val LOCATION_REQUEST_CODE = 1001
        const val WIFI_REQUEST_CODE = 1002

        const val ACCESS_FINE_LOCATION = Manifest.permission.ACCESS_FINE_LOCATION
        const val ACCESS_COARSE_LOCATION = Manifest.permission.ACCESS_COARSE_LOCATION
        const val ACCESS_WIFI_STATE = Manifest.permission.ACCESS_WIFI_STATE
        const val CHANGE_WIFI_STATE = Manifest.permission.CHANGE_WIFI_STATE
        const val INTERNET = Manifest.permission.INTERNET

        /**
         * Android 13+ uses the NEARBY_WIFI_DEVICES permission for WiFi operations.
         * Android 8-12 still relies mainly on location permission for WiFi scans.
         */
        val NEARBY_WIFI_DEVICES = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            Manifest.permission.NEARBY_WIFI_DEVICES
        } else {
            ""
        }

        val LOCATION_PERMISSIONS = arrayOf(
            ACCESS_FINE_LOCATION,
            ACCESS_COARSE_LOCATION,
        )
    }

    object Wifi {
        const val SCAN_TIMEOUT_MS = 15_000L
        const val MIN_SCAN_INTERVAL_MS = 3_000L
        const val MAX_SCAN_INTERVAL_MS = 5_000L
        const val DEFAULT_SCAN_INTERVAL_MS = 4_000L
        const val MAX_RESULTS_LIMIT = 200
        const val RSSI_UNKNOWN = Int.MIN_VALUE
    }

    object Service {
        const val POSITION_UPDATE_INTERVAL_MS = 4_000L
        const val FOREGROUND_NOTIFICATION_ID = 4201
        const val NOTIFICATION_CHANNEL_ID = "position_service_channel"
        const val NOTIFICATION_CHANNEL_NAME = "Position Service"

        const val ACTION_START = "com.ibnips.kotlinapp.action.START_POSITION_SERVICE"
        const val ACTION_STOP = "com.ibnips.kotlinapp.action.STOP_POSITION_SERVICE"
    }

    object Storage {
        const val PREFS_NAME = "ibnips_preferences"

        const val KEY_MOCK_MODE = "key_mock_mode"
        const val KEY_LAST_SCAN = "key_last_scan"
        const val KEY_LAST_LOCATION = "key_last_location"
        const val KEY_USER_SETTINGS = "key_user_settings"
        const val KEY_FLOOR_IMAGE_CACHE = "key_floor_image_cache"
        const val KEY_API_BASE_URL = "key_api_base_url"
        const val KEY_LAST_SYNC_TIME = "key_last_sync_time"
    }

    object Bridge {
        const val MODULE_NAME = "WifiBridgeModule"

        const val METHOD_CHECK_PERMISSIONS = "checkPermissions"
        const val METHOD_REQUEST_PERMISSIONS = "requestPermissions"
        const val METHOD_START_SCAN = "startWifiScan"
        const val METHOD_GET_LAST_SCAN = "getLastScan"
        const val METHOD_SET_MOCK_MODE = "setMockMode"
        const val METHOD_GET_MOCK_MODE = "getMockMode"
        const val METHOD_START_SERVICE = "startPositionService"
        const val METHOD_STOP_SERVICE = "stopPositionService"
        const val METHOD_GET_LAST_LOCATION = "getLastLocation"
    }

    object Api {
        const val DEFAULT_BASE_URL = "https://example.com/"
        const val CONNECT_TIMEOUT_SECONDS = 15L
        const val READ_TIMEOUT_SECONDS = 15L
        const val WRITE_TIMEOUT_SECONDS = 15L
        const val CALL_TIMEOUT_SECONDS = 30L
    }

    object Logging {
        const val WIFI = "WifiScanner"
        const val PERMISSIONS = "PermissionManager"
        const val SERVICE = "PositionService"
        const val STORAGE = "PreferenceManager"
        const val API = "ApiClient"
        const val MOCK = "MockDataProvider"
        const val BRIDGE = "WifiBridgeModule"
    }
}
