package com.ibnips.kotlinapp.data.repository

import app.cash.turbine.test
import com.ibnips.kotlinapp.domain.model.MockScenario
import com.ibnips.kotlinapp.domain.repository.DebugRepository
import com.ibnips.kotlinapp.domain.repository.SettingsRepository
import com.ibnips.kotlinapp.util.MainDispatcherRule
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class LocationRepositoryImplTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private lateinit var repository: LocationRepositoryImpl
    private val settingsRepository = mockk<SettingsRepository>()
    private val debugRepository = mockk<DebugRepository>()

    private val mockModeEnabled = MutableStateFlow(false)
    private val positionUpdateFreq = MutableStateFlow(1000L)
    private val currentScenario = MutableStateFlow(MockScenario.LAB_201)

    @Before
    fun setup() {
        every { settingsRepository.mockModeEnabled } returns mockModeEnabled
        every { settingsRepository.positionUpdateFreq } returns positionUpdateFreq
        every { debugRepository.getCurrentScenario() } returns currentScenario.value
        
        repository = LocationRepositoryImpl(settingsRepository, debugRepository)
    }

    @Test
    fun `getPositionUpdates emits values based on frequency`() = runTest {
        repository.getPositionUpdates().test {
            val first = awaitItem()
            assertEquals("Unknown Area", first.roomName ?: "Unknown Area") // EDGE_CASE has null roomName

            advanceTimeBy(1001)
            val second = awaitItem()
            assertEquals("Unknown Area", second.roomName ?: "Unknown Area")
            
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `getPositionUpdates switches to mock data when enabled`() = runTest {
        mockModeEnabled.value = true
        every { debugRepository.getCurrentScenario() } returns MockScenario.LAB_201
        
        repository.getPositionUpdates().test {
            val first = awaitItem()
            assertEquals("Lab 201", first.roomName)
            
            cancelAndIgnoreRemainingEvents()
        }
    }
}
