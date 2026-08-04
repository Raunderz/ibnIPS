package com.ibnips.kotlinapp.mock

import android.content.Context
import com.ibnips.kotlinapp.storage.PreferenceManager
import com.ibnips.kotlinapp.utils.Constants
import com.ibnips.kotlinapp.wifi.WifiResult
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

/**
 * Deterministic mock data generator for offline and development flows.
 *
 * Responsibilities:
 * - generate fake Wi-Fi scan results
 * - generate fake location snapshots
 * - respect the mock mode toggle stored in SharedPreferences
 * - provide repeatable data for testing and bridge/service fallbacks
 *
 * This provider never talks to the network and never touches UI.
 * It is designed so the repository can switch cleanly between live and mock data.
 */
class MockDataProvider(
    context: Context,
    private val preferenceManager: PreferenceManager = PreferenceManager(context),
) {

    private val appContext = context.applicationContext

    /**
     * Fixed seed anchor so results are stable within a single millisecond window,
     * but still change over time in a predictable way.
     */
    private val seedAnchor: Long
        get() = preferenceManager.getLastSyncTime().takeIf { it > 0L } ?: System.currentTimeMillis()

    fun isMockModeEnabled(): Boolean {
        return preferenceManager.isMockModeEnabled()
    }

    fun setMockModeEnabled(enabled: Boolean) {
        preferenceManager.setMockModeEnabled(enabled)
    }

    fun toggleMockMode(): Boolean {
        val next = !isMockModeEnabled()
        setMockModeEnabled(next)
        return next
    }

    fun getModeLabel(): String {
        return if (isMockModeEnabled()) "mock" else "live"
    }

    /**
     * Generate a realistic list of Wi-Fi scan results.
     * The result list is pseudo-random but stable for the same seed.
     */
    fun generateWifiResults(
        seed: Long = seedAnchor,
        count: Int = 8,
    ): List<WifiResult> {
        val safeCount = count.coerceIn(1, Constants.Wifi.MAX_RESULTS_LIMIT.coerceAtMost(20))
        val random = Random(seed)
        val baseTimestamp = System.currentTimeMillis()
        val ssidPool = buildSsidPool()
        val vendorPool = buildVendorPool()

        return buildList {
            repeat(safeCount) { index ->
                val vendor = vendorPool[index % vendorPool.size]
                val ssid = "${vendor}_${100 + index}"
                val bssid = buildBssid(random, index)
                val rssi = random.nextInt(-88, -28)
                val frequency = chooseFrequency(random, index)
                add(
                    WifiResult(
                        ssid = ssid.ifBlank { ssidPool[index % ssidPool.size] },
                        bssid = bssid,
                        rssi = rssi,
                        frequency = frequency,
                        timestamp = baseTimestamp - (index * 750L),
                    ),
                )
            }
        }.sortedByDescending { it.rssi }
    }

    /**
     * Generate a fake location snapshot near a stable pseudo-random anchor point.
     * This helps the background service and bridge operate in offline mode.
     */
    fun generateFakeLocation(seed: Long = seedAnchor): PreferenceManager.StoredLocation {
        val random = Random(seed)

        // A loose anchor around central India, with small movement offsets.
        val anchorLat = 22.5726
        val anchorLon = 88.3639
        val driftLat = (random.nextDouble(-1.0, 1.0) * 0.015) + sin(seed.toDouble() / 30_000.0) * 0.0025
        val driftLon = (random.nextDouble(-1.0, 1.0) * 0.015) + cos(seed.toDouble() / 30_000.0) * 0.0025

        return PreferenceManager.StoredLocation(
            latitude = anchorLat + driftLat,
            longitude = anchorLon + driftLon,
            accuracy = random.nextFloat().coerceAtLeast(6.0f) * 1.5f,
            timestamp = System.currentTimeMillis(),
        )
    }

    /**
     * Generate and persist mock Wi-Fi results.
     * This is convenient for offline demo flows and service fallbacks.
     */
    fun generateAndSaveWifiResults(seed: Long = seedAnchor): List<WifiResult> {
        val results = generateWifiResults(seed = seed)
        preferenceManager.saveLastScan(results)
        return results
    }

    /**
     * Generate and persist a fake location snapshot.
     */
    fun generateAndSaveFakeLocation(seed: Long = seedAnchor): PreferenceManager.StoredLocation {
        val location = generateFakeLocation(seed)
        preferenceManager.saveLastLocation(
            latitude = location.latitude,
            longitude = location.longitude,
            accuracy = location.accuracy,
            timestamp = location.timestamp,
        )
        return location
    }

    /**
     * Returns the current mock snapshot bundle.
     * The repository can use this when mock mode is enabled.
     */
    fun buildMockSnapshot(seed: Long = seedAnchor): MockSnapshot {
        val wifiResults = generateWifiResults(seed = seed)
        val location = generateFakeLocation(seed = seed)
        return MockSnapshot(
            wifiResults = wifiResults,
            location = location,
            generatedAt = System.currentTimeMillis(),
        )
    }

    /**
     * Useful for previewing whether a scan should be mocked or live.
     */
    fun shouldUseMockData(): Boolean {
        return isMockModeEnabled()
    }

    private fun buildSsidPool(): List<String> {
        return listOf(
            "CampusNet",
            "LibraryWiFi",
            "LabNet",
            "GuestConnect",
            "IoT-Floor",
            "AdminSecure",
            "TransitHub",
            "ResearchMesh",
        )
    }

    private fun buildVendorPool(): List<String> {
        return listOf(
            "TPLink",
            "Cisco",
            "Ubiquiti",
            "Netgear",
            "MikroTik",
            "DLink",
            "Aruba",
            "ASUS",
        )
    }

    private fun buildBssid(random: Random, index: Int): String {
        val octets = IntArray(6)
        octets[0] = 0x2A
        octets[1] = 0x11
        octets[2] = random.nextInt(0x00, 0xFF)
        octets[3] = random.nextInt(0x00, 0xFF)
        octets[4] = random.nextInt(0x00, 0xFF)
        octets[5] = (index + random.nextInt(0x00, 0xFF)) and 0xFF

        return octets.joinToString(":") { octet ->
            "%02X".format(octet)
        }
    }

    private fun chooseFrequency(random: Random, index: Int): Int {
        return when ((index + random.nextInt(0, 3)) % 4) {
            0 -> random.nextInt(2412, 2473) // 2.4 GHz band
            1 -> random.nextInt(5180, 5885) // 5 GHz band
            2 -> random.nextInt(5955, 7115) // 6 GHz band
            else -> 2462
        }
    }

    data class MockSnapshot(
        val wifiResults: List<WifiResult>,
        val location: PreferenceManager.StoredLocation,
        val generatedAt: Long,
    )
}

