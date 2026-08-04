package com.ibnips.kotlinapp.presentation.settings

data class SettingsUiState(
    val mockModeEnabled: Boolean = false,
    val appVersion: String = "0.1.0",
    val buildDate: String = "2024-12-25",
    val isResetDialogVisible: Boolean = false
)

sealed interface SettingsUiEvent {
    data class OnMockModeChanged(val enabled: Boolean) : SettingsUiEvent
    data class OnInjectScenario(val scenarioName: String) : SettingsUiEvent
    data object OnResetDataClicked : SettingsUiEvent
    data object OnConfirmReset : SettingsUiEvent
    data object OnDismissReset : SettingsUiEvent
    data object OnViewTutorial : SettingsUiEvent
}

sealed interface SettingsUiEffect {
    data object NavigateToOnboarding : SettingsUiEffect
    data class ShowToast(val message: String) : SettingsUiEffect
}
