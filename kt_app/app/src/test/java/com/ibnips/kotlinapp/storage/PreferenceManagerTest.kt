package com.ibnips.kotlinapp.storage

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.ibnips.kotlinapp.wifi.WifiResult
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Unit tests for [PreferenceManager], verifying that data is correctly
 * persisted and retrieved from SharedPreferences using Robolectric.
 */
@RunWith(RobolectricTestRunner::class)
class PreferenceManagerTest {

    private lateinit var context: Context
    private lateinit var preferenceManager: PreferenceManager

    @Before
    fun setup() {
        context = ApplicationProvider.getApplicationContext()
        preferenceManager = PreferenceManager(context)
        preferenceManager.clearAll()
    }

    /**
     * Verifies that the mock mode toggle is correctly persisted.
     */
    @Test
    fun `mock mode persistence works`() {
        assertFalse(preferenceManager.isMockModeEnabled())
        preferenceManager.setMockModeEnabled(true)
        assertTrue(preferenceManager.isMockModeEnabled())
    }

    /**
     * Verifies that Wi-Fi scan results are correctly serialized to JSON and deserialized back.
     */
    @Test
    fun `save and get last scan works`() {
        val results = listOf(
            WifiResult("SSID1", "BSSID1", -50, 2400, System.currentTimeMillis()),
            WifiResult("SSID2", "BSSID2", -60, 5000, System.currentTimeMillis())
        )
        
        preferenceManager.saveLastScan(results)
        val retrieved = preferenceManager.getLastScan()
        
        assertEquals(2, retrieved.size)
        assertEquals("SSID1", retrieved[0].ssid)
        assertEquals("BSSID2", retrieved[1].bssid)
    }

    /**
     * Verifies that the last known location coordinates and accuracy are correctly stored.
     */
    @Test
    fun `save and get last location works`() {
        preferenceManager.saveLastLocation(12.34, 56.78, 10.5f)
        val location = preferenceManager.getLastLocation()
        
        assertTrue(location != null)
        assertEquals(12.34, location!!.latitude, 0.0001)
        assertEquals(56.78, location.longitude, 0.0001)
        assertEquals(10.5f, location.accuracy ?: 0f)
    }

    /**
     * Verifies that clearAll removes all stored preferences and resets to defaults.
     */
    @Test
    fun `clearAll removes all preferences`() {
        preferenceManager.setMockModeEnabled(true)
        preferenceManager.saveApiBaseUrl("https://test.com")
        
        preferenceManager.clearAll()
        
        assertFalse(preferenceManager.isMockModeEnabled())
        // Default URL defined in Constants.Api.DEFAULT_BASE_URL
        assertEquals("http://192.168.1.100:8080/api/", preferenceManager.getApiBaseUrl())
    }
}
