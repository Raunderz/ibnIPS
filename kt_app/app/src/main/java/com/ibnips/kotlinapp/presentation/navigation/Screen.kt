package com.ibnips.kotlinapp.presentation.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Settings
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(val route: String, val label: String = "", val icon: ImageVector? = null) {
    data object Onboarding : Screen("onboarding")
    data object Home : Screen("home?floor={floor}", "Home", Icons.Default.Home) {
        fun createRoute(floor: Int = 1) = "home?floor=$floor"
    }
    data object Tag : Screen("tag", "Tag", Icons.Default.Place)
    data object Settings : Screen("settings", "Settings", Icons.Default.Settings)
}
