package com.ibnips.kotlinapp.presentation.navigation

sealed class Screen(val route: String) {
    data object Onboarding : Screen("onboarding")
    data object Home : Screen("home?floor={floor}") {
        fun createRoute(floor: Int = 1) = "home?floor=$floor"
    }
    data object Tag : Screen("tag")
    data object Settings : Screen("settings")
}
