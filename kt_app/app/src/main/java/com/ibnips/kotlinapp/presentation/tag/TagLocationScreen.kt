package com.ibnips.kotlinapp.presentation.tag

import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ibnips.kotlinapp.core.theme.Dimens
import com.ibnips.kotlinapp.ui.components.ICPSButton

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TagLocationScreen(
    onNavigateBack: () -> Unit,
    viewModel: TagViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    var expanded by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.uiEffect.collect { effect ->
            when (effect) {
                TagUiEffect.NavigateBack -> onNavigateBack()
                is TagUiEffect.ShowToast -> {
                    Toast.makeText(context, effect.message, Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

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
                        onClick = { viewModel.onEvent(TagUiEvent.OnConfirmTag) },
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
                    modifier = Modifier.menuAnchor().fillMaxWidth()
                )

                ExposedDropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false }
                ) {
                    uiState.availableRooms.forEach { room ->
                        DropdownMenuItem(
                            text = { Text(room.name) },
                            onClick = {
                                viewModel.onEvent(TagUiEvent.OnRoomSelected(room))
                                expanded = false
                            }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Visible Networks (${uiState.visibleNetworks.size})",
                    style = MaterialTheme.typography.titleMedium
                )
                if (uiState.isScanning) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                }
            }
            
            if (uiState.isScanning && uiState.visibleNetworks.isEmpty()) {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)
                )
            } else {
                Spacer(modifier = Modifier.height(8.dp))
            }

            Box(modifier = Modifier.weight(1f)) {
                if (uiState.visibleNetworks.isEmpty() && !uiState.isScanning) {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = uiState.errorMessage ?: "No networks found. Ensure Location and Wi-Fi are enabled.",
                            style = MaterialTheme.typography.bodyMedium,
                            textAlign = TextAlign.Center,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 32.dp)
                        )
                    }
                } else {
                    LazyColumn(modifier = Modifier.fillMaxSize()) {
                        items(uiState.visibleNetworks) { network ->
                            NetworkRow(network.ssid, network.rssi)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            ICPSButton(
                text = "Confirm Tag",
                onClick = { viewModel.onEvent(TagUiEvent.OnConfirmTag) },
                modifier = Modifier.fillMaxWidth(),
                enabled = uiState.selectedRoom != null,
                isLoading = uiState.uploadState == UploadState.Loading
            )
        }
    }
}

@Composable
fun NetworkRow(ssid: String, rssi: Int) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = "• ${ssid.ifBlank { "Hidden Network" }}", style = MaterialTheme.typography.bodyLarge)
        Text(
            text = "$rssi dBm",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
