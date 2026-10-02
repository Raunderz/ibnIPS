package com.ibnips.app.ui.components

import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun DestinationMarker(
    modifier: Modifier = Modifier
) {
    Icon(
        imageVector = Icons.Default.LocationOn,
        contentDescription = "Destination",
        tint = MaterialTheme.colorScheme.error,
        modifier = modifier.size(32.dp)
    )
}
