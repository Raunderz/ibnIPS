package com.ibnips.kotlinapp.presentation

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import com.ibnips.kotlinapp.domain.model.Position
import com.ibnips.kotlinapp.presentation.home.HomeScreen
import com.ibnips.kotlinapp.presentation.home.HomeUiState
import org.junit.Rule
import org.junit.Test

class HomeScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun homeScreen_displaysPositionInformation() {
        val testPosition = Position(
            floor = 2,
            x = 0.5f,
            y = 0.5f,
            confidence = 85,
            roomName = "Lab 201"
        )
        
        composeTestRule.setContent {
            HomeScreen(
                uiState = HomeUiState(
                    position = testPosition,
                    nearestRoom = "Lab 201",
                    confidence = 85,
                    currentFloor = 2
                ),
                onEvent = {}
            )
        }

        composeTestRule.onNodeWithText("Lab 201").assertExists()
        composeTestRule.onNodeWithText("85%").assertExists()
        composeTestRule.onNodeWithText("Floor 2").assertExists()
    }

    @Test
    fun homeScreen_showsLoadingWhenUpdating() {
        composeTestRule.setContent {
            HomeScreen(
                uiState = HomeUiState(isUpdating = true),
                onEvent = {}
            )
        }

        // Assuming there is some text or content-desc for loading
        // Based on typical implementation, we might check for a progress indicator 
        // or just verify that the "Updating..." state is handled.
        // For now, let's assume it shows "Updating..."
        composeTestRule.onNodeWithText("Updating...").assertExists()
    }
}
