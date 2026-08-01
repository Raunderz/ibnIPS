package com.ibnips.kotlinapp.presentation.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibnips.kotlinapp.domain.repository.LocationRepository
import com.ibnips.kotlinapp.domain.repository.SettingsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * UI Events for the Home Screen
 */
sealed interface HomeUiEvent {
    data class OnFloorSelected(val floor: Int) : HomeUiEvent
    data object OnRefreshRequested : HomeUiEvent
    data object OnNavigateToTag : HomeUiEvent
    data object OnNavigateToSettings : HomeUiEvent
}

/**
 * One-time UI Effects (Navigation, Toasts)
 */
sealed interface HomeUiEffect {
    data object NavigateToTag : HomeUiEffect
    data object NavigateToSettings : HomeUiEffect
    data class ShowToast(val message: String) : HomeUiEffect
}

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val locationRepository: LocationRepository,
    private val settingsRepository: SettingsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private val _uiEffect = MutableSharedFlow<HomeUiEffect>()
    val uiEffect: SharedFlow<HomeUiEffect> = _uiEffect.asSharedFlow()

    init {
        observePositionUpdates()
        observeSettings()
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
                        isUpdating = false
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

    fun onEvent(event: HomeUiEvent) {
        when (event) {
            is HomeUiEvent.OnFloorSelected -> {
                _uiState.update { it.copy(currentFloor = event.floor) }
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

    private fun refreshPosition() {
        viewModelScope.launch {
            _uiState.update { it.copy(isUpdating = true) }
            kotlinx.coroutines.delay(500)
            _uiState.update { it.copy(isUpdating = false) }
        }
    }
}
