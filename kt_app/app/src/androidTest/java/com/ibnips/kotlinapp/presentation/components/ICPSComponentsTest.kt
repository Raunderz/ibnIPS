package com.ibnips.kotlinapp.presentation.components

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.ibnips.kotlinapp.core.theme.IBNIPSTheme
import org.junit.Rule
import org.junit.Test

class ICPSComponentsTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun icpsButton_displaysTextAndIsClickable() {
        var clicked = false
        composeTestRule.setContent {
            IBNIPSTheme {
                ICPSButton(
                    text = "Test Button",
                    onClick = { clicked = true }
                )
            }
        }

        composeTestRule.onNodeWithText("Test Button").assertExists().performClick()
        assert(clicked)
    }

    @Test
    fun icpsCard_displaysContent() {
        composeTestRule.setContent {
            IBNIPSTheme {
                ICPSCard(title = "Card Title") {
                    // Content
                }
            }
        }

        composeTestRule.onNodeWithText("Card Title").assertExists()
    }
}
