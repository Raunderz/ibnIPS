package com.ibnips.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ibnips.app.data.model.PositioningState
import com.ibnips.app.ui.components.CampusMapView
import com.ibnips.app.ui.viewmodel.CampusViewModel
import com.ibnips.app.ui.viewmodel.IndoorPositioningViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun IndoorPositioningScreen(
    viewModel: IndoorPositioningViewModel,
    campusViewModel: CampusViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val state by viewModel.positioningState.collectAsState()
    val currentLocation by viewModel.currentLocation.collectAsState()
    val detectedAPs by viewModel.detectedAPs.collectAsState()
    val matchedAPs by viewModel.matchedAPs.collectAsState()

    var scale by remember { mutableFloatStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Indoor Positioning") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = modifier
                .padding(innerPadding)
                .fillMaxSize()
        ) {
            // Status Section
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = when (state) {
                        PositioningState.LOCATED -> MaterialTheme.colorScheme.primaryContainer
                        PositioningState.LOW_CONFIDENCE -> MaterialTheme.colorScheme.errorContainer
                        else -> MaterialTheme.colorScheme.surfaceVariant
                    }
                )
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = when (state) {
                            PositioningState.IDLE -> "Ready to locate"
                            PositioningState.SCANNING -> "Scanning Wi-Fi..."
                            PositioningState.MATCHING -> "Matching fingerprints..."
                            PositioningState.LOCATED -> "You are here"
                            PositioningState.LOW_CONFIDENCE -> "Location uncertain"
                            PositioningState.NO_FINGERPRINTS -> "No campus data"
                            PositioningState.NO_WIFI -> "No Wi-Fi detected"
                            PositioningState.PERMISSION_REQUIRED -> "Permission required"
                            PositioningState.ERROR -> "Positioning error"
                        },
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )

                    if (state == PositioningState.LOCATED || state == PositioningState.LOW_CONFIDENCE) {
                        currentLocation?.let { loc ->
                            Text(text = "Location: ${loc.displayName}", style = MaterialTheme.typography.bodyLarge)
                            Text(text = "Block: ${loc.blockId}, Floor: ${loc.floorId}", style = MaterialTheme.typography.bodySmall)
                            
                            Spacer(modifier = Modifier.height(8.dp))
                            
                            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                Column {
                                    Text(text = "Confidence", style = MaterialTheme.typography.labelSmall)
                                    Text(text = "${(loc.confidence * 100).toInt()}%", fontWeight = FontWeight.Bold)
                                }
                                Column {
                                    Text(text = "APs (Matched/Total)", style = MaterialTheme.typography.labelSmall)
                                    Text(text = "$matchedAPs / $detectedAPs", fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    if (state == PositioningState.NO_FINGERPRINTS) {
                        Text(
                            text = "No Wi-Fi fingerprints registered. Please use Admin mode to calibrate locations.",
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = { viewModel.startPositioning() },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = state != PositioningState.SCANNING && state != PositioningState.MATCHING
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(if (state == PositioningState.IDLE) "Scan & Locate" else "Scan Again")
                    }
                }
            }

            // Map Section
            Box(modifier = Modifier.weight(1f)) {
                if (currentLocation != null) {
                    val loc = currentLocation!!
                    CampusMapView(
                        scale = scale,
                        offset = offset,
                        onTransform = { s, o -> scale = s; offset = o },
                        rooms = campusViewModel.getRooms(loc.blockId, loc.floorId),
                        facilities = campusViewModel.getFacilities(loc.blockId, loc.floorId),
                        checkpoints = campusViewModel.getCheckpoints(loc.blockId, loc.floorId),
                        userLocation = Offset(loc.x, loc.y),
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(text = "Map will appear when located", color = MaterialTheme.colorScheme.outline)
                    }
                }
            }
        }
    }
}
