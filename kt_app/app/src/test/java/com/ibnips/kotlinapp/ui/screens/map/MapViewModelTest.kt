package com.ibnips.kotlinapp.ui.screens.map

import app.cash.turbine.test
import com.ibnips.kotlinapp.domain.model.Position
import com.ibnips.kotlinapp.domain.repository.LocationRepository
import com.ibnips.kotlinapp.domain.repository.SettingsRepository
import com.ibnips.kotlinapp.util.MainDispatcherRule
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test

class MapViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private lateinit var viewModel: MapViewModel
    private val locationRepository = mockk<LocationRepository>(relaxed = true)
    private val settingsRepository = mockk<SettingsRepository>(relaxed = true)

    private val positionFlow = MutableStateFlow(Position(1, 0.5f, 0.5f, 90, "Lab 201"))
    private val mockModeFlow = MutableStateFlow(false)

    @Before
    fun setup() {
        every { locationRepository.getPositionUpdates() } returns positionFlow
        every { settingsRepository.mockModeEnabled } returns mockModeFlow
        
        viewModel = MapViewModel(locationRepository, settingsRepository)
    }

    @Test
    fun `initial state observes position and mock mode`() = runTest {
        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals("Lab 201", state.nearestRoom)
            assertEquals(90, state.confidence)
            assertFalse(state.isMockMode)
        }
    }

    @Test
    fun `selectFloor updates current floor in state`() = runTest {
        viewModel.selectFloor(3)
        assertEquals(3, viewModel.uiState.value.currentFloor)
    }

    @Test
    fun `refreshPosition triggers loading state`() = runTest {
        viewModel.refreshPosition()
        
        assertTrue(viewModel.uiState.value.isUpdating)
        mainDispatcherRule.testDispatcher.scheduler.advanceTimeBy(501)
        assertFalse(viewModel.uiState.value.isUpdating)
    }
}
