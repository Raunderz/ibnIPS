package com.ibnips.app.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun MoreScreen(
    onNavigateToAdmin: () -> Unit,
    onNavigateToWifiTest: () -> Unit,
    modifier: Modifier = Modifier
) {
    var showFeatureDialog by remember { mutableStateOf(false) }
    var dialogTitle by remember { mutableStateOf("") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = "Settings & More",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 24.dp)
        )

        MoreItem(
            title = "App Settings",
            icon = Icons.Default.Settings,
            onClick = {}
        )
        MoreItem(
            title = "About KIIT Campus",
            icon = Icons.Default.Info,
            onClick = {}
        )
        
        HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
        
        Text(
            text = "Smart Campus Features",
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(bottom = 8.dp)
        )

        MoreItem(
            title = "Today's Classes",
            icon = Icons.Default.DateRange,
            onClick = { dialogTitle = "Today's Classes"; showFeatureDialog = true }
        )
        MoreItem(
            title = "Section Explorer",
            icon = Icons.Default.AccountBox,
            onClick = { dialogTitle = "Section Explorer"; showFeatureDialog = true }
        )
        MoreItem(
            title = "Classroom Finder",
            icon = Icons.Default.Search,
            onClick = { dialogTitle = "Classroom Finder"; showFeatureDialog = true }
        )
        MoreItem(
            title = "Feedback",
            icon = Icons.Default.Star,
            onClick = { dialogTitle = "Feedback"; showFeatureDialog = true }
        )
        MoreItem(
            title = "Report Issue",
            icon = Icons.Default.Warning,
            onClick = { dialogTitle = "Report Issue"; showFeatureDialog = true }
        )

        HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
        
        Text(
            text = "Development & Testing",
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(bottom = 8.dp)
        )

        MoreItem(
            title = "Wi-Fi Scanner Test",
            icon = Icons.Default.Refresh,
            onClick = onNavigateToWifiTest
        )

        HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
        
        Text(
            text = "Administrator",
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        
        MoreItem(
            title = "Admin / Mapping Mode",
            icon = Icons.Default.Settings,
            onClick = onNavigateToAdmin
        )
    }

    if (showFeatureDialog) {
        AlertDialog(
            onDismissRequest = { showFeatureDialog = false },
            title = { Text(dialogTitle) },
            text = {
                if (dialogTitle.contains("Feedback") || dialogTitle.contains("Issue")) {
                    Column {
                        Text("Submit details regarding room locations, routes, map correctness, or Wi-Fi accuracy:")
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = "",
                            onValueChange = {},
                            placeholder = { Text("Comment description...") },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                } else {
                    Text("No local timetable or section data available for today. Please register campus details via Admin / Mapping Mode.")
                }
            },
            confirmButton = {
                Button(onClick = { showFeatureDialog = false }) {
                    Text("Done")
                }
            }
        )
    }
}

@Composable
fun MoreItem(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.width(16.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}
