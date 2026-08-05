package com.ibnips.kotlinapp.presentation.tag

import app.cash.turbine.test
import com.ibnips.kotlinapp.domain.model.Room
import com.ibnips.kotlinapp.domain.repository.RoomRepository
import com.ibnips.kotlinapp.util.MainDispatcherRule
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class TagViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private lateinit var viewModel: TagViewModel
    private val roomRepository = mockk<RoomRepository>()
    private val mockRooms = listOf(
        Room("1", "Lab 201", 2, "Test Description"),
        Room("2", "Hall 1F", 1, "Test Description")
    )

    @Before
    fun setup() {
        every { roomRepository.getRooms() } returns flowOf(mockRooms)
        viewModel = TagViewModel(roomRepository)
    }

    @Test
    fun `initial state loads rooms and starts wifi scanning`() = runTest {
        viewModel.uiState.test {
            val state = awaitItem()
            assertEquals(2, state.availableRooms.size)
            assertEquals("Lab 201", state.availableRooms[0].name)
            
            // Advance time to check wifi scan simulation
            advanceTimeBy(3001)
            val stateWithWifi = awaitItem()
            assertTrue(stateWithWifi.visibleNetworks.isNotEmpty())
            assertEquals("Campus_WiFi", stateWithWifi.visibleNetworks[0].ssid)
        }
    }

    @Test
    fun `OnRoomSelected updates state`() = runTest {
        val selectedRoom = mockRooms[1]
        viewModel.onEvent(TagUiEvent.OnRoomSelected(selectedRoom))
        assertEquals(selectedRoom, viewModel.uiState.value.selectedRoom)
    }

    @Test
    fun `confirmTag updates upload state and navigates back`() = runTest {
        val selectedRoom = mockRooms[0]
        viewModel.onEvent(TagUiEvent.OnRoomSelected(selectedRoom))
        
        viewModel.uiEffect.test {
            viewModel.onEvent(TagUiEvent.OnConfirmTag)
            
            // Initial state check for loading
            assertEquals(UploadState.Loading, viewModel.uiState.value.uploadState)
            
            // Advance time for simulated upload delay
            advanceTimeBy(2001)
            
            assertEquals(UploadState.Success, viewModel.uiState.value.uploadState)
            
            val effect1 = awaitItem()
            assertTrue(effect1 is TagUiEffect.ShowToast)
            assertEquals("Tagged as Lab 201", (effect1 as TagUiEffect.ShowToast).message)
            
            val effect2 = awaitItem()
            assertEquals(TagUiEffect.NavigateBack, effect2)
        }
    }
}
