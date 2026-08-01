package com.ibnips.kotlinapp.permissions

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationManager
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat

/**
 * Central permission gatekeeper for the ibnIPS application.
 */
object PermissionManager {

    /**
     * Returns the set of permissions required for WiFi scanning based on Android version.
     */
    fun getWifiRuntimePermissions(): Array<String> {
        return when {
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU -> {
                arrayOf(Manifest.permission.NEARBY_WIFI_DEVICES)
            }
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q -> {
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
            }
            else -> {
                arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION)
            }
        }
    }

    /**
     * Returns the set of permissions required for location updates.
     */
    fun getLocationRuntimePermissions(): Array<String> {
        return arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
    }

    /**
     * Returns the notification permission required for Android 13+.
     */
    fun getNotificationPermission(): Array<String> {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            arrayOf(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            emptyArray()
        }
    }

    /**
     * Returns all runtime permissions required for the app's core features.
     */
    fun getAllRequiredPermissions(): Array<String> {
        return (getWifiRuntimePermissions() + getLocationRuntimePermissions() + getNotificationPermission())
            .distinct()
            .toTypedArray()
    }

    fun hasPermission(context: Context, permission: String): Boolean {
        if (permission.isEmpty()) return true
        return ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
    }

    fun hasWifiPermissions(context: Context): Boolean {
        return getWifiRuntimePermissions().all { hasPermission(context, it) }
    }

    fun hasLocationPermission(context: Context): Boolean {
        return hasPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ||
                hasPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION)
    }

    fun hasRequiredPermissions(context: Context): Boolean {
        // Many parts of the app check this to ensure both wifi and location are ready
        return hasWifiPermissions(context) && hasLocationPermission(context)
    }

    fun hasNotificationPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            hasPermission(context, Manifest.permission.POST_NOTIFICATIONS)
        } else {
            true
        }
    }

    /**
     * Checks if location services (GPS/Network) are enabled on the device.
     */
    fun isLocationEnabled(context: Context): Boolean {
        val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager ?: return false
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            locationManager.isLocationEnabled
        } else {
            try {
                @Suppress("DEPRECATION")
                Settings.Secure.getInt(context.contentResolver, Settings.Secure.LOCATION_MODE) != Settings.Secure.LOCATION_MODE_OFF
            } catch (_: Exception) {
                false
            }
        }
    }

    /**
     * Alias for isLocationEnabled to match existing code expectations.
     */
    fun isLocationServicesEnabled(context: Context): Boolean = isLocationEnabled(context)
}
