package com.ibnips.kotlinapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
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

                    Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
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
