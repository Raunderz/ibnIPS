package com.ibnips.app.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.ibnips.app.ui.navigation.Screen

@Composable
fun BottomNavigationBar(
    currentScreen: Screen,
    onScreenSelected: (Screen) -> Unit,
    modifier: Modifier = Modifier
) {
    NavigationBar(modifier = modifier) {
        NavigationBarItem(
            selected = currentScreen == Screen.Home || currentScreen == Screen.BuildingDetail,
            onClick = { onScreenSelected(Screen.Home) },
            icon = { Icon(Icons.Default.Home, contentDescription = "Home") },
            label = { Text("Home") }
        )
        NavigationBarItem(
            selected = currentScreen == Screen.Map,
            onClick = { onScreenSelected(Screen.Map) },
            icon = { Icon(Icons.Default.LocationOn, contentDescription = "Map") },
            label = { Text("Map") }
        )
        NavigationBarItem(
            selected = currentScreen == Screen.Navigate,
            onClick = { onScreenSelected(Screen.Navigate) },
            icon = { Icon(Icons.Default.Info, contentDescription = "Navigate") },
            label = { Text("Navigate") }
        )
        NavigationBarItem(
            selected = currentScreen == Screen.More || currentScreen == Screen.AdminMapping,
            onClick = { onScreenSelected(Screen.More) },
            icon = { Icon(Icons.Default.MoreVert, contentDescription = "More") },
            label = { Text("More") }
        )
    }
}
