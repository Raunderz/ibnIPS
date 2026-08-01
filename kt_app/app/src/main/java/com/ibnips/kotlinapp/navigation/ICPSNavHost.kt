package com.ibnips.kotlinapp.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.ibnips.kotlinapp.ui.screens.map.MapScreen
import com.ibnips.kotlinapp.ui.screens.onboarding.OnboardingScreen
import com.ibnips.kotlinapp.ui.screens.settings.SettingsScreen
import com.ibnips.kotlinapp.ui.screens.tag.TagLocationScreen

@Composable
fun ICPSNavHost(
    navController: NavHostController,
    startDestination: String,
    modifier: Modifier = Modifier
) {
    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier
    ) {
        composable(Screen.Onboarding.route) {
            OnboardingScreen(
                onFinish = {
                    navController.navigate(Screen.Map.route) {
                        popUpTo(Screen.Onboarding.route) { inclusive = true }
                    }
                }
            )
        }
        composable(
            route = Screen.Map.route,
            arguments = listOf(
                navArgument("floor") {
                    type = NavType.IntType
                    defaultValue = 1
                }
            )
        ) { backStackEntry ->
            val floor = backStackEntry.arguments?.getInt("floor") ?: 1
            MapScreen(
                initialFloor = floor,
                onNavigateToTag = { navController.navigate(Screen.Tag.route) },
                onNavigateToSettings = { navController.navigate(Screen.Settings.route) }
            )
        }
        composable(Screen.Tag.route) {
            TagLocationScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable(Screen.Settings.route) {
            SettingsScreen(
                onNavigateBack = { navController.popBackStack() },
                onViewTutorial = { navController.navigate(Screen.Onboarding.route) }
            )
        }
    }
}
