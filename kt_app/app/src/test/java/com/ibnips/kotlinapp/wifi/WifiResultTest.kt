package com.ibnips.kotlinapp.wifi

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.json.JSONObject

class WifiResultTest {

    @Test
    fun `isValid returns true for valid data`() {
        val result = WifiResult("SSID", "00:11:22:33:44:55", -50, 2400, 1000L)
        assertTrue(result.isValid)
    }

    @Test
    fun `isValid returns false for blank SSID or BSSID`() {
        val invalidSsid = WifiResult("", "00:11:22:33:44:55", -50, 2400, 1000L)
        val invalidBssid = WifiResult("SSID", "", -50, 2400, 1000L)
        
        assertFalse(invalidSsid.isValid)
        assertFalse(invalidBssid.isValid)
    }

    @Test
    fun `toJsonObject and fromJson are consistent`() {
        val original = WifiResult("TestWiFi", "AA:BB:CC", -45, 5000, 9999L)
        val json = original.toJsonObject()
        val restored = WifiResult.fromJson(json)
        
        assertEquals(original, restored)
    }

    @Test
    fun `toMap contains all expected keys`() {
        val result = WifiResult("SSID", "BSSID", -50, 2400, 1000L)
        val map = result.toMap()
        
        assertEquals("SSID", map[WifiResult.KEY_SSID])
        assertEquals("BSSID", map[WifiResult.KEY_BSSID])
        assertEquals(-50, map[WifiResult.KEY_RSSI])
        assertEquals(2400, map[WifiResult.KEY_FREQUENCY])
        assertEquals(1000L, map[WifiResult.KEY_TIMESTAMP])
    }
}
