package com.ibnips.kotlinapp.ui.screens.map

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibnips.kotlinapp.domain.model.Position
import com.ibnips.kotlinapp.domain.repository.LocationRepository
import com.ibnips.kotlinapp.domain.repository.SettingsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MapViewModel @Inject constructor(
    private val locationRepository: LocationRepository,
    private val settingsRepository: SettingsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(MapUiState())
    val uiState: StateFlow<MapUiState> = _uiState.asStateFlow()

    init {
        observePositionUpdates()
        observeSettings()
    }

    private fun observePositionUpdates() {
        viewModelScope.launch {
            _uiState.update { it.copy(isUpdating = true) }
            locationRepository.getPositionUpdates().collect { position ->
                _uiState.update { 
                    it.copy(
                        position = position,
                        nearestRoom = position.roomName ?: "Unknown Area",
                        confidence = position.confidence,
                        isUpdating = false
                    )
                }
            }
        }
    }

    private fun observeSettings() {
        viewModelScope.launch {
            settingsRepository.mockModeEnabled.collect { isMock ->
                _uiState.update { it.copy(isMockMode = isMock) }
            }
        }
    }

    fun selectFloor(floor: Int) {
        _uiState.update { it.copy(currentFloor = floor) }
    }

    fun refreshPosition() {
        viewModelScope.launch {
            _uiState.update { it.copy(isUpdating = true) }
            kotlinx.coroutines.delay(500)
            _uiState.update { it.copy(isUpdating = false) }
        }
    }
}
