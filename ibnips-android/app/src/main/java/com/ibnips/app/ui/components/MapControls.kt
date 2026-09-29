package com.ibnips.app.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp

@Composable
fun MapControls(
    onZoomIn: () -> Unit,
    onZoomOut: () -> Unit,
    onCenter: () -> Unit,
    onReset: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.padding(16.dp),
        horizontalAlignment = Alignment.End
    ) {
        MapControlFAB(icon = Icons.Default.Add, contentDescription = "Zoom In", onClick = onZoomIn)
        Spacer(modifier = Modifier.height(8.dp))
        MapControlFAB(icon = Icons.Default.Refresh, contentDescription = "Zoom Out", onClick = onZoomOut) // Using Refresh for minus for now or custom
        Spacer(modifier = Modifier.height(8.dp))
        MapControlFAB(icon = Icons.Default.LocationOn, contentDescription = "Center", onClick = onCenter)
        Spacer(modifier = Modifier.height(8.dp))
        MapControlFAB(icon = Icons.Default.Refresh, contentDescription = "Reset", onClick = onReset)
    }
}

@Composable
private fun MapControlFAB(
    icon: ImageVector,
    contentDescription: String,
    onClick: () -> Unit
) {
    FloatingActionButton(
        onClick = onClick,
        containerColor = MaterialTheme.colorScheme.surface,
        contentColor = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(4.dp)
    ) {
        Icon(icon, contentDescription = contentDescription)
    }
}
