package com.ibnips.kotlinapp.data.repository

import app.cash.turbine.test
import com.ibnips.kotlinapp.domain.model.MockScenario
import com.ibnips.kotlinapp.domain.repository.SettingsRepository
import com.ibnips.kotlinapp.util.MainDispatcherRule
import com.ibnips.kotlinapp.wifi.WifiScanner
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Before
import org.junit.Rule
import org.junit.Test

/**
 * Unit tests for [PositionRepository], focusing on the periodic position
 * updates and reaction to mock scenario changes.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class PositionRepositoryTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private lateinit var repository: PositionRepository
    private val settingsRepository = mockk<SettingsRepository>()
    private val wifiScanner = mockk<WifiScanner>(relaxed = true)
    
    private val mockModeEnabled = MutableStateFlow(false)
    private val positionUpdateFreq = MutableStateFlow(1000L)

    @Before
    fun setup() {
        every { settingsRepository.mockModeEnabled } returns mockModeEnabled
        every { settingsRepository.positionUpdateFreq } returns positionUpdateFreq
        
        repository = PositionRepository(settingsRepository, wifiScanner)
    }

    /**
     * Verifies that [PositionRepository.getPositionUpdates] emits values periodically
     * based on the frequency defined in [SettingsRepository].
     */
    @Test
    fun `getPositionUpdates emits values according to frequency`() = runTest {
        repository.getPositionUpdates().test {
            // Initial emit
            val first = awaitItem()
            assertNotNull(first)
            
            // Advance time to trigger next emit
            advanceTimeBy(1001)
            val second = awaitItem()
            assertNotNull(second)
            
            cancelAndIgnoreRemainingEvents()
        }
    }

    /**
     * Verifies that the repository updates its internal mock state when a new
     * [MockScenario] is injected, and reflects this in the next emitted position.
     */
    @Test
    fun `getPositionUpdates reacts to mock scenario change`() = runTest {
        mockModeEnabled.value = true
        repository.injectMockScenario(MockScenario.HALL_1F)
        
        repository.getPositionUpdates().test {
            val position = awaitItem()
            assertEquals("Hall 1F", position.roomName)
            
            // Change scenario
            repository.injectMockScenario(MockScenario.LAB_201)

            // Advance time for the next periodic update
            advanceTimeBy(1001)
            val nextPosition = awaitItem()
            assertEquals("Lab 201", nextPosition.roomName)
            
            cancelAndIgnoreRemainingEvents()
        }
    }
}
