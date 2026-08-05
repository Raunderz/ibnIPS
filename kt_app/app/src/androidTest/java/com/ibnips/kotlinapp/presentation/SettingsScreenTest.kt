package com.ibnips.kotlinapp.presentation

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.ibnips.kotlinapp.presentation.settings.SettingsScreen
import com.ibnips.kotlinapp.presentation.settings.SettingsUiState
import org.junit.Rule
import org.junit.Test

class SettingsScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun settingsScreen_displaysTitle() {
        composeTestRule.setContent {
            SettingsScreen(
                uiState = SettingsUiState(),
                onEvent = {}
            )
        }

        composeTestRule.onNodeWithText("Settings").assertExists()
        composeTestRule.onNodeWithText("Mock Mode").assertExists()
    }

    @Test
    fun settingsScreen_clickingMockMode_triggersEvent() {
        var eventTriggered = false
        composeTestRule.setContent {
            SettingsScreen(
                uiState = SettingsUiState(mockModeEnabled = false),
                onEvent = { eventTriggered = true }
            )
        }

        composeTestRule.onNodeWithText("Mock Mode").performClick()
        assert(eventTriggered)
    }
}
