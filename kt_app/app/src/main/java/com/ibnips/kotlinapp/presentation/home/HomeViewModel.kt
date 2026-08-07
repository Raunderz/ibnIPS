package com.ibnips.kotlinapp.presentation.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibnips.kotlinapp.domain.model.Room
import com.ibnips.kotlinapp.domain.repository.LocationRepository
import com.ibnips.kotlinapp.domain.repository.RoomRepository
import com.ibnips.kotlinapp.domain.repository.SettingsRepository
import com.ibnips.kotlinapp.storage.PreferenceManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface HomeUiEvent {
    data class OnFloorSelected(val floor: Int) : HomeUiEvent
    data class OnSearchQueryChanged(val query: String) : HomeUiEvent
    data class OnRoomClicked(val room: Room) : HomeUiEvent
    data class OnCategoryClicked(val category: String) : HomeUiEvent
    data object OnDismissBottomSheet : HomeUiEvent
    data object OnRefreshRequested : HomeUiEvent
    data object OnNavigateToTag : HomeUiEvent
    data object OnNavigateToSettings : HomeUiEvent
}

sealed interface HomeUiEffect {
    data object NavigateToTag : HomeUiEffect
    data object NavigateToSettings : HomeUiEffect
    data class ShowToast(val message: String) : HomeUiEffect
}

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val locationRepository: LocationRepository,
    private val roomRepository: RoomRepository,
    private val settingsRepository: SettingsRepository,
    private val preferenceManager: PreferenceManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private val _uiEffect = MutableSharedFlow<HomeUiEffect>()
    val uiEffect: SharedFlow<HomeUiEffect> = _uiEffect.asSharedFlow()

    init {
        observePositionUpdates()
        observeSettings()
        loadRooms()
        updateSavedTagsCount()
    }

    private fun observePositionUpdates() {
        locationRepository.getPositionUpdates()
            .onStart { _uiState.update { it.copy(isUpdating = true) } }
            .onEach { position ->
                _uiState.update {
                    it.copy(
                        position = position,
                        nearestRoom = position.roomName ?: "Unknown Area",
                        confidence = position.confidence,
                        isUpdating = false,
                        lastScanTime = "Just now"
                    )
                }
            }
            .launchIn(viewModelScope)
    }

    private fun observeSettings() {
        settingsRepository.mockModeEnabled
            .onEach { isMock ->
                _uiState.update { it.copy(isMockMode = isMock) }
            }
            .launchIn(viewModelScope)
    }

    private fun loadRooms() {
        roomRepository.getRooms()
            .onEach { rooms ->
                _uiState.update { state ->
                    state.copy(
                        rooms = rooms,
                        filteredRooms = filterRooms(state.searchQuery, rooms),
                        recentRooms = rooms.take(2),
                        studySpacesCount = rooms.count { it.name.contains("Library", true) || it.name.contains("Lab", true) },
                        busyAreasCount = rooms.count { (it.occupancy ?: 0) > (it.capacity ?: 100) * 0.8 }
                    )
                }
            }
            .launchIn(viewModelScope)
    }

    fun onEvent(event: HomeUiEvent) {
        when (event) {
            is HomeUiEvent.OnFloorSelected -> {
                _uiState.update { it.copy(currentFloor = event.floor) }
            }
            is HomeUiEvent.OnSearchQueryChanged -> {
                _uiState.update { state ->
                    state.copy(
                        searchQuery = event.query,
                        filteredRooms = filterRooms(event.query, state.rooms)
                    )
                }
            }
            is HomeUiEvent.OnRoomClicked -> {
                _uiState.update { it.copy(selectedRoom = event.room, showRoomSheet = true) }
            }
            is HomeUiEvent.OnCategoryClicked -> {
                onEvent(HomeUiEvent.OnSearchQueryChanged(event.category))
            }
            HomeUiEvent.OnDismissBottomSheet -> {
                _uiState.update { it.copy(showRoomSheet = false) }
            }
            HomeUiEvent.OnRefreshRequested -> {
                refreshPosition()
            }
            HomeUiEvent.OnNavigateToTag -> {
                viewModelScope.launch { _uiEffect.emit(HomeUiEffect.NavigateToTag) }
            }
            HomeUiEvent.OnNavigateToSettings -> {
                viewModelScope.launch { _uiEffect.emit(HomeUiEffect.NavigateToSettings) }
            }
        }
    }

    private fun updateSavedTagsCount() {
        val count = preferenceManager.getFingerprints().size
        _uiState.update { it.copy(savedTagsCount = count) }
    }

    private fun filterRooms(query: String, rooms: List<Room>): List<Room> {
        if (query.isBlank()) return emptyList()
        return rooms.filter { it.name.contains(query, ignoreCase = true) }
    }

    private fun refreshPosition() {
        viewModelScope.launch {
            _uiState.update { it.copy(isUpdating = true) }
            // Actually trigger the repository to perform a new scan
            locationRepository.forceRefresh()
            updateSavedTagsCount()
        }
    }
}
