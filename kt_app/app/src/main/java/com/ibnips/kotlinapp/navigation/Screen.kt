package com.ibnips.kotlinapp.navigation

sealed class Screen(val route: String) {
    data object Onboarding : Screen("onboarding")
    data object Map : Screen("map?floor={floor}") {
        fun createRoute(floor: Int = 1) = "map?floor=$floor"
    }
    data object Tag : Screen("tag")
    data object Settings : Screen("settings")
}
