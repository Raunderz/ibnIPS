package com.ibnips.app.ui.screens

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ibnips.app.ui.components.CampusMapView
import com.ibnips.app.ui.components.FloorSelector
import com.ibnips.app.ui.components.MapControls
import com.ibnips.app.ui.viewmodel.CampusViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapScreen(
    blockId: String?,
    floorId: String?,
    viewModel: CampusViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedBlockId by remember { mutableStateOf(blockId ?: viewModel.blocks.value.firstOrNull()?.id ?: "") }
    var selectedFloorId by remember { mutableStateOf(floorId ?: viewModel.getFloors(selectedBlockId).firstOrNull()?.id ?: "") }

    val blocks = viewModel.blocks.value
    val currentBlock = blocks.find { it.id == selectedBlockId }
    val floors = viewModel.getFloors(selectedBlockId)
    val currentFloor = floors.find { it.id == selectedFloorId }

    var scale by remember { mutableStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = currentBlock?.displayName ?: "Campus Map",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        if (currentFloor != null) {
                            Text(
                                text = currentFloor.displayName,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { innerPadding ->
        Box(modifier = modifier.padding(innerPadding).fillMaxSize()) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Floor Selector at the top
                FloorSelector(
                    floors = floors,
                    selectedFloorId = selectedFloorId,
                    onFloorSelected = { floor ->
                        selectedFloorId = floor.id
                        // Reset map view on floor change
                        scale = 1f
                        offset = Offset.Zero
                    }
                )

                if (currentFloor == null) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(text = "Please select a floor")
                    }
                } else {
                    // Reusable Map View
                    CampusMapView(
                        scale = scale,
                        offset = offset,
                        onTransform = { newScale, newOffset ->
                            scale = newScale
                            offset = newOffset
                        },
                        rooms = viewModel.getRooms(selectedBlockId, selectedFloorId),
                        facilities = viewModel.getFacilities(selectedBlockId, selectedFloorId),
                        checkpoints = viewModel.getCheckpoints(selectedBlockId, selectedFloorId),
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // Map Controls Overlay
            MapControls(
                onZoomIn = { scale = (scale * 1.2f).coerceAtMost(5f) },
                onZoomOut = { scale = (scale / 1.2f).coerceAtLeast(0.5f) },
                onCenter = { offset = Offset.Zero },
                onReset = {
                    scale = 1f
                    offset = Offset.Zero
                },
                modifier = Modifier.align(Alignment.BottomEnd)
            )

            // Empty State Overlay for no map configured
            val roomsOnFloor = viewModel.getRooms(selectedBlockId, selectedFloorId)
            val facilitiesOnFloor = viewModel.getFacilities(selectedBlockId, selectedFloorId)
            val checkpointsOnFloor = viewModel.getCheckpoints(selectedBlockId, selectedFloorId)
            
            if (currentFloor != null && 
                roomsOnFloor.none { it.isMapped } && 
                facilitiesOnFloor.none { it.isMapped } && 
                checkpointsOnFloor.none { it.isMapped }) {
                Column(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Floor Map Not Configured",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
                    )
                    Text(
                        text = "Add registered locations on map in admin mode.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
                    )
                }
            }
        }
    }
}
