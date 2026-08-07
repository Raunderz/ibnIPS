package com.ibnips.kotlinapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.ibnips.kotlinapp.domain.repository.SettingsRepository
import com.ibnips.kotlinapp.presentation.navigation.ICPSNavHost
import com.ibnips.kotlinapp.presentation.navigation.Screen
import com.ibnips.kotlinapp.ui.theme.ICPSTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var settingsRepository: SettingsRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val hasSeenOnboarding by settingsRepository.hasSeenOnboarding.collectAsState(initial = null)

            ICPSTheme {
                if (hasSeenOnboarding != null) {
                    val navController = rememberNavController()
                    val startDestination = if (hasSeenOnboarding == true) {
                        Screen.Home.route
                    } else {
                        Screen.Onboarding.route
                    }

                    val navBackStackEntry by navController.currentBackStackEntryAsState()
                    val currentDestination = navBackStackEntry?.destination
                    
                    // Only show bottom bar if we are on a main screen (not onboarding)
                    val showBottomBar = currentDestination?.route != Screen.Onboarding.route

                    Scaffold(
                        modifier = Modifier.fillMaxSize(),
                        bottomBar = {
                            if (showBottomBar) {
                                ICPSBottomBar(navController)
                            }
                        }
                    ) { innerPadding ->
                        ICPSNavHost(
                            navController = navController,
                            startDestination = startDestination,
                            modifier = Modifier.padding(innerPadding)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ICPSBottomBar(navController: NavHostController) {
    val items = listOf(
        Screen.Home,
        Screen.Tag,
        Screen.Settings
    )
    NavigationBar {
        val navBackStackEntry by navController.currentBackStackEntryAsState()
        val currentDestination = navBackStackEntry?.destination
        items.forEach { screen ->
            NavigationBarItem(
                icon = { screen.icon?.let { Icon(it, contentDescription = screen.label) } },
                label = { Text(screen.label) },
                selected = currentDestination?.hierarchy?.any { it.route == screen.route } == true,
                onClick = {
                    navController.navigate(screen.route) {
                        popUpTo(navController.graph.findStartDestination().id) {
                            saveState = true
                        }
                        launchSingleTop = true
                        restoreState = true
                    }
                }
            )
        }
    }
}
