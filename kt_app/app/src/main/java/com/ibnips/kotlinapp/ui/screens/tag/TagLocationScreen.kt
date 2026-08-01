package com.ibnips.kotlinapp.ui.screens.tag

import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ibnips.kotlinapp.data.model.Room
import com.ibnips.kotlinapp.ui.components.ICPSButton
import com.ibnips.kotlinapp.ui.theme.Dimens

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TagLocationScreen(
    onNavigateBack: () -> Unit,
    viewModel: TagLocationViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    var expanded by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tag Your Location") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(
                        onClick = { 
                            viewModel.confirmTag { 
                                Toast.makeText(context, "Tagged as ${uiState.selectedRoom?.name}", Toast.LENGTH_SHORT).show()
                                onNavigateBack() 
                            } 
                        },
                        enabled = uiState.selectedRoom != null && uiState.uploadState == UploadState.Idle
                    ) {
                        Icon(Icons.Default.Check, contentDescription = "Confirm")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(Dimens.ScreenPaddingH)
        ) {
            Text(
                text = "Select Room",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            // Exposed Dropdown Menu Box
            ExposedDropdownMenuBox(
                expanded = expanded,
                onExpandedChange = { expanded = !expanded },
                modifier = Modifier.fillMaxWidth()
            ) {
                OutlinedTextField(
                    value = uiState.selectedRoom?.name ?: "",
                    onValueChange = {},
                    readOnly = true,
                    placeholder = { Text("Pick a room...") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                    colors = ExposedDropdownMenuDefaults.outlinedTextFieldColors(),
                    modifier = Modifier
                        .menuAnchor()
                        .fillMaxWidth()
                )

                ExposedDropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false }
                ) {
                    uiState.availableRooms.forEach { room ->
                        DropdownMenuItem(
                            text = { Text(room.name) },
                            onClick = {
                                viewModel.selectRoom(room)
                                expanded = false
                            },
                            contentPadding = ExposedDropdownMenuDefaults.ItemContentPadding
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "Visible Networks (${uiState.visibleNetworks.size})",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            ) {
                items(uiState.visibleNetworks) { network ->
                    NetworkRow(network.ssid, network.rssi)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            ICPSButton(
                text = "Confirm Tag",
                onClick = {
                    viewModel.confirmTag {
                        Toast.makeText(context, "Tagged Successfully", Toast.LENGTH_SHORT).show()
                        onNavigateBack()
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = uiState.selectedRoom != null,
                isLoading = uiState.uploadState == UploadState.Loading
            )
        }
    }

    // Error Dialog
    if (uiState.uploadState is UploadState.Error) {
        AlertDialog(
            onDismissRequest = { viewModel.resetUploadState() },
            title = { Text("Upload Failed") },
            text = { Text((uiState.uploadState as UploadState.Error).message) },
            confirmButton = {
                TextButton(onClick = { viewModel.confirmTag { onNavigateBack() } }) {
                    Text("Retry")
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.resetUploadState() }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun NetworkRow(ssid: String, rssi: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = "• $ssid", style = MaterialTheme.typography.bodyLarge)
        Text(
            text = "$rssi dBm",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
