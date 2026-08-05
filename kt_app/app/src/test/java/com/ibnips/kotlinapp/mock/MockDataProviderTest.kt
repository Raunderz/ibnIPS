package com.ibnips.kotlinapp.mock

import android.content.Context
import com.ibnips.kotlinapp.storage.PreferenceManager
import io.mockk.mockk
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for [MockDataProvider], ensuring deterministic data generation
 * for Wi-Fi results and location snapshots.
 */
class MockDataProviderTest {

    private lateinit var mockDataProvider: MockDataProvider
    private val context = mockk<Context>(relaxed = true)
    private val preferenceManager = mockk<PreferenceManager>(relaxed = true)

    @Before
    fun setup() {
        mockDataProvider = MockDataProvider(context, preferenceManager)
    }

    /**
     * Verifies that [MockDataProvider.generateWifiResults] returns the exact
     * number of requested results.
     */
    @Test
    fun `generateWifiResults returns requested number of results`() {
        val results = mockDataProvider.generateWifiResults(count = 5)
        assertEquals(5, results.size)
    }

    /**
     * Verifies that data generation is deterministic when using the same seed.
     */
    @Test
    fun `generateWifiResults is deterministic with same seed`() {
        val seed = 12345L
        val results1 = mockDataProvider.generateWifiResults(seed = seed)
        val results2 = mockDataProvider.generateWifiResults(seed = seed)
        
        assertEquals(results1, results2)
    }

    /**
     * Verifies that generated fake locations fall within expected geographical bounds
     * and have positive accuracy values.
     */
    @Test
    fun `generateFakeLocation returns valid coordinates`() {
        val location = mockDataProvider.generateFakeLocation()
        
        // Central India anchor is around 22.5, 88.3
        assertTrue(location.latitude in 20.0..25.0)
        assertTrue(location.longitude in 85.0..90.0)
        assertTrue((location.accuracy ?: 0f) > 0f)
    }

    /**
     * Verifies that location generation is deterministic when using the same seed.
     */
    @Test
    fun `generateFakeLocation is deterministic with same seed`() {
        val seed = 54321L
        val loc1 = mockDataProvider.generateFakeLocation(seed)
        val loc2 = mockDataProvider.generateFakeLocation(seed)
        
        assertEquals(loc1.latitude, loc2.latitude, 0.000001)
        assertEquals(loc1.longitude, loc2.longitude, 0.000001)
    }

    /**
     * Verifies that the mock snapshot bundle contains both Wi-Fi and location data.
     */
    @Test
    fun `buildMockSnapshot contains wifi and location`() {
        val snapshot = mockDataProvider.buildMockSnapshot()
        assertTrue(snapshot.wifiResults.isNotEmpty())
        assertTrue(snapshot.location.latitude != 0.0)
    }
}
