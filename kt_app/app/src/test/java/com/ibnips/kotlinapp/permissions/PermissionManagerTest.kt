package com.ibnips.kotlinapp.permissions

import android.Manifest
import android.os.Build
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * Unit tests for [PermissionManager], verifying version-specific permission
 * requirements for Wi-Fi scanning and notifications.
 */
@RunWith(RobolectricTestRunner::class)
class PermissionManagerTest {

    /**
     * Verifies that on Android 13 (API 33) and above, the NEARBY_WIFI_DEVICES
     * permission is required for Wi-Fi scanning.
     */
    @Test
    @Config(sdk = [Build.VERSION_CODES.TIRAMISU])
    fun `getWifiRuntimePermissions returns NEARBY_WIFI_DEVICES on API 33+`() {
        val permissions = PermissionManager.getWifiRuntimePermissions()
        assertArrayEquals(arrayOf(Manifest.permission.NEARBY_WIFI_DEVICES), permissions)
    }

    /**
     * Verifies that on Android 11 (API 30), ACCESS_FINE_LOCATION is required
     * for Wi-Fi scanning as NEARBY_WIFI_DEVICES did not exist yet.
     */
    @Test
    @Config(sdk = [Build.VERSION_CODES.R])
    fun `getWifiRuntimePermissions returns ACCESS_FINE_LOCATION on API 30`() {
        val permissions = PermissionManager.getWifiRuntimePermissions()
        assertArrayEquals(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION), permissions)
    }

    /**
     * Verifies that location permissions always include both FINE and COARSE location.
     */
    @Test
    fun `getLocationRuntimePermissions returns both fine and coarse`() {
        val permissions = PermissionManager.getLocationRuntimePermissions()
        assertTrue(permissions.contains(Manifest.permission.ACCESS_FINE_LOCATION))
        assertTrue(permissions.contains(Manifest.permission.ACCESS_COARSE_LOCATION))
    }

    /**
     * Verifies that on Android 13 (API 33) and above, the POST_NOTIFICATIONS
     * permission is returned for foreground services.
     */
    @Test
    @Config(sdk = [Build.VERSION_CODES.TIRAMISU])
    fun `getNotificationPermission returns POST_NOTIFICATIONS on API 33+`() {
        val permissions = PermissionManager.getNotificationPermission()
        assertArrayEquals(arrayOf(Manifest.permission.POST_NOTIFICATIONS), permissions)
    }

    /**
     * Verifies that on older Android versions (e.g., API 31), no runtime permission
     * is required for notifications.
     */
    @Test
    @Config(sdk = [Build.VERSION_CODES.S])
    fun `getNotificationPermission returns empty on API 31`() {
        val permissions = PermissionManager.getNotificationPermission()
        assertTrue(permissions.isEmpty())
    }
}
