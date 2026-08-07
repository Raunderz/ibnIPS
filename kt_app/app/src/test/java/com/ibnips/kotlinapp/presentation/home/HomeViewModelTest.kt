package com.ibnips.kotlinapp.presentation.home

import app.cash.turbine.test
import com.ibnips.kotlinapp.domain.model.Position
import com.ibnips.kotlinapp.domain.repository.LocationRepository
import com.ibnips.kotlinapp.domain.repository.RoomRepository
import com.ibnips.kotlinapp.domain.repository.SettingsRepository
import com.ibnips.kotlinapp.storage.PreferenceManager
import com.ibnips.kotlinapp.util.MainDispatcherRule
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Rule
import org.junit.Test

/**
 * Unit tests for [HomeViewModel], verifying UI state updates based on position
 * changes and user interaction events.
 */
class HomeViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private lateinit var viewModel: HomeViewModel
    private val locationRepository = mockk<LocationRepository>(relaxed = true)
    private val roomRepository = mockk<RoomRepository>(relaxed = true)
    private val settingsRepository = mockk<SettingsRepository>(relaxed = true)
    private val preferenceManager = mockk<PreferenceManager>(relaxed = true)

    private val positionFlow = MutableStateFlow(Position(1, 0.5f, 0.5f, 100, "Test Room"))
    private val mockModeFlow = MutableStateFlow(false)

    @Before
    fun setup() {
        every { locationRepository.getPositionUpdates() } returns positionFlow
        every { settingsRepository.mockModeEnabled } returns mockModeFlow
        every { roomRepository.getRooms() } returns flowOf(emptyList())
        
        viewModel = HomeViewModel(
            locationRepository = locationRepository,
            roomRepository = roomRepository,
            settingsRepository = settingsRepository,
            preferenceManager = preferenceManager
        )
    }

    /**
     * Verifies that the ViewModel correctly initializes its UI state by observing
     * the location and settings repositories.
     */
    @Test
    fun `initial state observes position and settings`() = runTest {
        viewModel.uiState.test {
            val initialState = awaitItem()
            assertEquals("Test Room", initialState.nearestRoom)
            assertEquals(100, initialState.confidence)
            assertEquals(false, initialState.isMockMode)
        }
    }

    /**
     * Verifies that selecting a different floor updates the UI state accordingly.
     */
    @Test
    fun `OnFloorSelected updates state`() = runTest {
        viewModel.onEvent(HomeUiEvent.OnFloorSelected(2))
        assertEquals(2, viewModel.uiState.value.currentFloor)
    }

    /**
     * Verifies that the navigation event to settings is correctly emitted as a UI effect.
     */
    @Test
    fun `OnNavigateToSettings emits NavigateToSettings effect`() = runTest {
        viewModel.uiEffect.test {
            viewModel.onEvent(HomeUiEvent.OnNavigateToSettings)
            assertEquals(HomeUiEffect.NavigateToSettings, awaitItem())
        }
    }

    /**
     * Verifies that when the [LocationRepository] emits a new position, the UI state
     * is updated to reflect the new location data.
     */
    @Test
    fun `position updates are reflected in UI state`() = runTest {
        viewModel.uiState.test {
            awaitItem() // Initial state
            
            val newPosition = Position(2, 0.1f, 0.2f, 80, "New Lab")
            positionFlow.value = newPosition
            
            val updatedState = awaitItem()
            assertEquals("New Lab", updatedState.nearestRoom)
            assertEquals(80, updatedState.confidence)
        }
    }
}
