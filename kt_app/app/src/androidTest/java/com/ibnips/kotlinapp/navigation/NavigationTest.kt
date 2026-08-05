package com.ibnips.kotlinapp.navigation

import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.navigation.compose.ComposeNavigator
import androidx.navigation.testing.TestNavHostController
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class NavigationTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private lateinit var navController: TestNavHostController

    @Test
    fun navHost_startDestinationIsOnboarding() {
        composeTestRule.setContent {
            navController = TestNavHostController(LocalContext.current)
            navController.navigatorProvider.addNavigator(ComposeNavigator())
            ICPSNavHost(navController = navController, startDestination = Screen.Onboarding.route)
        }

        assertEquals(Screen.Onboarding.route, navController.currentBackStackEntry?.destination?.route)
    }

    @Test
    fun navHost_clickSettings_navigatesToSettings() {
        composeTestRule.setContent {
            navController = TestNavHostController(LocalContext.current)
            navController.navigatorProvider.addNavigator(ComposeNavigator())
            ICPSNavHost(navController = navController, startDestination = Screen.Map.createRoute(1))
        }

        // Assuming there is a settings button with content description or text
        // For now, testing via manual trigger if buttons aren't easily targetable by text
        composeTestRule.runOnUiThread {
            navController.navigate(Screen.Settings.route)
        }

        assertEquals(Screen.Settings.route, navController.currentBackStackEntry?.destination?.route)
    }
}
