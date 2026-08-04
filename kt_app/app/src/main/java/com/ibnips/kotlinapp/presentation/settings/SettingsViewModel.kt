package com.ibnips.kotlinapp.presentation.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibnips.kotlinapp.domain.model.MockScenario
import com.ibnips.kotlinapp.domain.repository.DebugRepository
import com.ibnips.kotlinapp.domain.repository.SettingsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val settingsRepository: SettingsRepository,
    private val debugRepository: DebugRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    private val _uiEffect = MutableSharedFlow<SettingsUiEffect>()
    val uiEffect: SharedFlow<SettingsUiEffect> = _uiEffect.asSharedFlow()

    init {
        observeSettings()
    }

    private fun observeSettings() {
        settingsRepository.mockModeEnabled
            .onEach { isEnabled ->
                _uiState.update { it.copy(mockModeEnabled = isEnabled) }
            }
            .launchIn(viewModelScope)
    }

    fun onEvent(event: SettingsUiEvent) {
        when (event) {
            is SettingsUiEvent.OnMockModeChanged -> {
                viewModelScope.launch {
                    settingsRepository.setMockModeEnabled(event.enabled)
                }
            }
            is SettingsUiEvent.OnInjectScenario -> {
                val scenario = when (event.scenarioName) {
                    "Lab 201" -> MockScenario.LAB_201
                    "Hall 1F" -> MockScenario.HALL_1F
                    "Physics" -> MockScenario.PHYSICS
                    else -> MockScenario.EDGE_CASE
                }
                debugRepository.injectMockScenario(scenario)
                viewModelScope.launch {
                    _uiEffect.emit(SettingsUiEffect.ShowToast("Injected: ${event.scenarioName}"))
                }
            }
            SettingsUiEvent.OnResetDataClicked -> {
                _uiState.update { it.copy(isResetDialogVisible = true) }
            }
            SettingsUiEvent.OnConfirmReset -> {
                viewModelScope.launch {
                    settingsRepository.clearAllData()
                    _uiState.update { it.copy(isResetDialogVisible = false) }
                    _uiEffect.emit(SettingsUiEffect.ShowToast("Data Reset. App restart recommended."))
                }
            }
            SettingsUiEvent.OnDismissReset -> {
                _uiState.update { it.copy(isResetDialogVisible = false) }
            }
            SettingsUiEvent.OnViewTutorial -> {
                viewModelScope.launch {
                    _uiEffect.emit(SettingsUiEffect.NavigateToOnboarding)
                }
            }
        }
    }
}
