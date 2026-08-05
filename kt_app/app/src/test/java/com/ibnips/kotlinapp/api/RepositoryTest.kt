package com.ibnips.kotlinapp.api

import android.content.Context
import com.ibnips.kotlinapp.mock.MockDataProvider
import com.ibnips.kotlinapp.storage.PreferenceManager
import com.ibnips.kotlinapp.wifi.WifiResult
import com.ibnips.kotlinapp.wifi.WifiScanner
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for [Repository], focusing on the logic of selecting data sources
 * (Mock, Live, Cache) based on settings and scanner outcomes.
 */
class RepositoryTest {

    private lateinit var repository: Repository
    private val context = mockk<Context>(relaxed = true)
    private val preferenceManager = mockk<PreferenceManager>(relaxed = true)
    private val wifiScanner = mockk<WifiScanner>(relaxed = true)
    private val mockDataProvider = mockk<MockDataProvider>(relaxed = true)

    @Before
    fun setup() {
        repository = Repository(context, preferenceManager, wifiScanner, mockDataProvider)
    }

    /**
     * Verifies that when mock mode is enabled in preferences, the repository
     * returns data from the [MockDataProvider].
     */
    @Test
    fun `getWifiSnapshot returns mock data when mock mode is enabled`() = runTest {
        every { preferenceManager.isMockModeEnabled() } returns true
        val mockResults = listOf(WifiResult("MockSSID", "BSSID", -40, 2400, 123L))
        every { mockDataProvider.generateWifiResults() } returns mockResults

        val result = repository.getWifiSnapshot()

        assertTrue(result is Repository.RepositoryResult.Success)
        val success = result as Repository.RepositoryResult.Success
        assertEquals(Repository.DataSource.MOCK, success.source)
        assertEquals(mockResults, success.data)
        verify { preferenceManager.saveLastScan(mockResults) }
    }

    /**
     * Verifies that when mock mode is disabled and the scanner succeeds,
     * the repository returns live data.
     */
    @Test
    fun `getWifiSnapshot returns live data when scanner succeeds`() = runTest {
        every { preferenceManager.isMockModeEnabled() } returns false
        val liveResults = listOf(WifiResult("LiveSSID", "BSSID", -50, 5000, 456L))
        coEvery { wifiScanner.scanNearbyNetworks(any()) } returns WifiScanner.WifiScanOutcome.Success(liveResults)

        val result = repository.getWifiSnapshot()

        assertTrue(result is Repository.RepositoryResult.Success)
        val success = result as Repository.RepositoryResult.Success
        assertEquals(Repository.DataSource.LIVE, success.source)
        assertEquals(liveResults, success.data)
        verify { preferenceManager.saveLastScan(liveResults) }
    }

    /**
     * Verifies that when a live scan fails (e.g., throttled), the repository
     * falls back to the last cached scan results.
     */
    @Test
    fun `getWifiSnapshot returns cache when scanner fails but cache exists`() = runTest {
        every { preferenceManager.isMockModeEnabled() } returns false
        coEvery { wifiScanner.scanNearbyNetworks(any()) } returns WifiScanner.WifiScanOutcome.Failure(
            reason = WifiScanner.WifiScanFailureReason.SCAN_THROTTLED,
            message = "Scan throttled",
            cachedResults = emptyList()
        )
        val lastScan = listOf(WifiResult("CachedSSID", "BSSID", -60, 2400, 789L))
        every { preferenceManager.getLastScan() } returns lastScan

        val result = repository.getWifiSnapshot()

        assertTrue(result is Repository.RepositoryResult.Success)
        val success = result as Repository.RepositoryResult.Success
        assertEquals(Repository.DataSource.CACHE, success.source)
        assertTrue(success.isStale)
        assertEquals(lastScan, success.data)
    }
}
