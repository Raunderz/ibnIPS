package com.ibnips.kotlinapp.mock

import android.content.Context
import com.ibnips.kotlinapp.storage.PreferenceManager
import com.ibnips.kotlinapp.utils.Constants
import com.ibnips.kotlinapp.wifi.WifiResult
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Deterministic mock data generator for offline and development flows.
 */
@Singleton
class MockDataProvider @Inject constructor(
    @ApplicationContext private val context: Context,
    private val preferenceManager: PreferenceManager,
) {

    private val appContext = context.applicationContext

    private val seedAnchor: Long
        get() = preferenceManager.getLastSyncTime().let { if (it > 0L) it else System.currentTimeMillis() }

    fun isMockModeEnabled(): Boolean = preferenceManager.isMockModeEnabled()

    fun setMockModeEnabled(enabled: Boolean) = preferenceManager.setMockModeEnabled(enabled)

    fun toggleMockMode(): Boolean {
        val next = !isMockModeEnabled()
        setMockModeEnabled(next)
        return next
    }

    fun getModeLabel(): String = if (isMockModeEnabled()) "mock" else "live"

    fun generateWifiResults(
        seed: Long = seedAnchor,
        count: Int = 8,
    ): List<WifiResult> {
        val safeCount = count.coerceIn(1, Constants.Wifi.MAX_RESULTS_LIMIT.coerceAtMost(20))
        val random = Random(seed)
        val baseTimestamp = System.currentTimeMillis()
        val vendorPool = listOf("TPLink", "Cisco", "Ubiquiti", "Netgear", "MikroTik", "DLink", "Aruba", "ASUS")

        return buildList {
            repeat(safeCount) { index ->
                val vendor = vendorPool[index % vendorPool.size]
                val ssid = "${vendor}_${100 + index}"
                val bssid = buildBssid(random, index)
                val rssi = random.nextInt(-88, -28)
                val frequency = chooseFrequency(random, index)
                add(
                    WifiResult(
                        ssid = ssid,
                        bssid = bssid,
                        rssi = rssi,
                        frequency = frequency,
                        timestamp = baseTimestamp - (index * 750L),
                    ),
                )
            }
        }.sortedByDescending { it.rssi }
    }

    fun generateFakeLocation(seed: Long = seedAnchor): PreferenceManager.StoredLocation {
        val random = Random(seed)
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

    fun generateAndSaveWifiResults(seed: Long = seedAnchor): List<WifiResult> {
        val results = generateWifiResults(seed = seed)
        preferenceManager.saveLastScan(results)
        return results
    }

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

    fun buildMockSnapshot(seed: Long = seedAnchor): MockSnapshot {
        val wifiResults = generateWifiResults(seed = seed)
        val location = generateFakeLocation(seed = seed)
        return MockSnapshot(
            wifiResults = wifiResults,
            location = location,
            generatedAt = System.currentTimeMillis(),
        )
    }

    fun shouldUseMockData(): Boolean = isMockModeEnabled()

    private fun buildBssid(random: Random, index: Int): String {
        val octets = IntArray(6)
        octets[0] = 0x2A
        octets[1] = 0x11
        octets[2] = random.nextInt(0x00, 0xFF)
        octets[3] = random.nextInt(0x00, 0xFF)
        octets[4] = random.nextInt(0x00, 0xFF)
        octets[5] = (index + random.nextInt(0x00, 0xFF)) and 0xFF
        return octets.joinToString(":") { "%02X".format(it) }
    }

    private fun chooseFrequency(random: Random, index: Int): Int {
        return when ((index + random.nextInt(0, 3)) % 4) {
            0 -> random.nextInt(2412, 2473)
            1 -> random.nextInt(5180, 5885)
            2 -> random.nextInt(5955, 7115)
            else -> 2462
        }
    }

    data class MockSnapshot(
        val wifiResults: List<WifiResult>,
        val location: PreferenceManager.StoredLocation,
        val generatedAt: Long,
    )
}
