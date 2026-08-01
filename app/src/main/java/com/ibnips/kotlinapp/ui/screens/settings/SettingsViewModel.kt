package com.ibnips.kotlinapp.ui.screens.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibnips.kotlinapp.domain.model.MockScenario
import com.ibnips.kotlinapp.domain.repository.DebugRepository
import com.ibnips.kotlinapp.domain.repository.SettingsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val settingsRepository: SettingsRepository,
    private val debugRepository: DebugRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            settingsRepository.mockModeEnabled.collect { isEnabled ->
                _uiState.update { it.copy(mockModeEnabled = isEnabled) }
            }
        }
    }

    fun setMockMode(enabled: Boolean) {
        viewModelScope.launch {
            settingsRepository.setMockModeEnabled(enabled)
        }
    }

    fun injectScenario(scenario: MockScenario) {
        debugRepository.injectMockScenario(scenario)
    }

    fun resetAllData() {
        viewModelScope.launch {
            settingsRepository.clearAllData()
        }
    }
}
