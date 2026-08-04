package com.ibnips.kotlinapp.presentation.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.ibnips.kotlinapp.presentation.home.HomeScreen
import com.ibnips.kotlinapp.presentation.onboarding.OnboardingScreen
import com.ibnips.kotlinapp.presentation.settings.SettingsScreen
import com.ibnips.kotlinapp.presentation.tag.TagLocationScreen

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
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Onboarding.route) { inclusive = true }
                    }
                }
            )
        }
        composable(
            route = Screen.Home.route,
            arguments = listOf(
                navArgument("floor") {
                    type = NavType.IntType
                    defaultValue = 1
                }
            )
        ) { backStackEntry ->
            val floor = backStackEntry.arguments?.getInt("floor") ?: 1
            HomeScreen(
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
