package com.ibnips.kotlinapp.ui.screens.settings

data class SettingsUiState(
    val mockModeEnabled: Boolean = false,
    val positionUpdateFreq: Long = 4000L,
    val serverEndpoint: String = "",
    val appVersion: String = "0.1.0",
    val buildDate: String = "2024-12-25"
)
