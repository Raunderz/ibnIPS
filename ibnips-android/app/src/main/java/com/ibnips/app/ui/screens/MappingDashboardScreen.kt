package com.ibnips.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ibnips.app.data.model.MappingLocationType
import com.ibnips.app.ui.viewmodel.CampusViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MappingDashboardScreen(
    viewModel: CampusViewModel,
    onAddRoom: () -> Unit,
    onAddCheckpoint: () -> Unit,
    onAddFacility: () -> Unit,
    onNavigationMapping: () -> Unit,
    onSetPosition: (type: String, id: String, blockId: String, floorId: String, x: Float?, y: Float?) -> Unit,
    onWifiCalibration: (id: String, type: MappingLocationType, blockId: String, floorId: String, name: String) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val blocks by viewModel.blocks
    
    var selectedFilterBlockId by remember { mutableStateOf<String?>(null) }
    var selectedFilterFloorId by remember { mutableStateOf<String?>(null) }

    val floors = if (selectedFilterBlockId != null) viewModel.getFloors(selectedFilterBlockId!!) else emptyList()
    
    val rooms = viewModel.getAllRooms().filter { 
        (selectedFilterBlockId == null || it.blockId == selectedFilterBlockId) &&
        (selectedFilterFloorId == null || it.floorId == selectedFilterFloorId)
    }
    val facilities = viewModel.getAllFacilities().filter { 
        (selectedFilterBlockId == null || it.blockId == selectedFilterBlockId) &&
        (selectedFilterFloorId == null || it.floorId == selectedFilterFloorId)
    }
    val checkpoints = viewModel.getAllCheckpoints().filter { 
        (selectedFilterBlockId == null || it.blockId == selectedFilterBlockId) &&
        (selectedFilterFloorId == null || it.floorId == selectedFilterFloorId)
    }
    
    var itemToDelete by remember { mutableStateOf<Pair<String, String>?>(null) }

    if (itemToDelete != null) {
        AlertDialog(
            onDismissRequest = { itemToDelete = null },
            title = { Text("Confirm Delete") },
            text = { Text("Are you sure you want to delete this registered location?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        val (type, id) = itemToDelete!!
                        when (type) {
                            "ROOM" -> viewModel.deleteRoom(id)
                            "FACILITY" -> viewModel.deleteFacility(id)
                            "CHECKPOINT" -> viewModel.deleteCheckpoint(id)
                        }
                        itemToDelete = null
                    }
                ) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { itemToDelete = null }) {
                    Text("Cancel")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Campus Mapping") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = modifier
                .padding(innerPadding)
                .fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text(
                    text = "Mapping Progress",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
            }

            items(blocks) { block ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                    )
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = block.displayName,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        val mappedCount = viewModel.getMappedLocationsCount(block.id, "")
                        Text(
                            text = if (mappedCount > 0) "$mappedCount locations mapped" else "Mapping not started",
                            style = MaterialTheme.typography.bodySmall,
                            color = if (mappedCount > 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                        )
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    MappingActionCard(
                        title = "Add Room",
                        onClick = onAddRoom,
                        modifier = Modifier.weight(1f)
                    )
                    MappingActionCard(
                        title = "Add Checkpoint",
                        onClick = onAddCheckpoint,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
            
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    MappingActionCard(
                        title = "Add Facility",
                        onClick = onAddFacility,
                        modifier = Modifier.weight(1f)
                    )
                    ElevatedCard(
                        onClick = onNavigationMapping,
                        modifier = Modifier.weight(1f).height(80.dp),
                        colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                    ) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Share, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(text = "Nav Graph", style = MaterialTheme.typography.labelLarge)
                            }
                        }
                    }
                }
            }

            item {
                Text(
                    text = "Registered Locations",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 16.dp)
                )
            }

            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(text = "Filter by Block", style = MaterialTheme.typography.labelMedium)
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        item {
                            FilterChip(
                                selected = selectedFilterBlockId == null,
                                onClick = { selectedFilterBlockId = null; selectedFilterFloorId = null },
                                label = { Text("All") }
                            )
                        }
                        items(blocks) { block ->
                            FilterChip(
                                selected = selectedFilterBlockId == block.id,
                                onClick = { selectedFilterBlockId = block.id; selectedFilterFloorId = null },
                                label = { Text(block.displayName) }
                            )
                        }
                    }
                    
                    if (selectedFilterBlockId != null) {
                        Text(text = "Filter by Floor", style = MaterialTheme.typography.labelMedium)
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            item {
                                FilterChip(
                                    selected = selectedFilterFloorId == null,
                                    onClick = { selectedFilterFloorId = null },
                                    label = { Text("All Floors") }
                                )
                            }
                            items(floors) { floor ->
                                FilterChip(
                                    selected = selectedFilterFloorId == floor.id,
                                    onClick = { selectedFilterFloorId = floor.id },
                                    label = { Text(floor.displayName) }
                                )
                            }
                        }
                    }
                }
            }

            if (rooms.isEmpty() && facilities.isEmpty() && checkpoints.isEmpty()) {
                item {
                    Text(
                        text = "No locations found for selected filters.",
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(vertical = 32.dp),
                        color = MaterialTheme.colorScheme.outline
                    )
                }
            }

            items(rooms) { room ->
                LocationItem(
                    name = "${room.roomNumber} - ${room.displayName}",
                    type = "Room",
                    isMapped = room.isMapped,
                    isCalibrated = viewModel.hasWifiFingerprint(room.id),
                    onSetPosition = { onSetPosition("ROOM", room.id, room.blockId, room.floorId, room.x, room.y) },
                    onWifiCalibration = { onWifiCalibration(room.id, MappingLocationType.ROOM, room.blockId, room.floorId, room.displayName) },
                    onDelete = { itemToDelete = "ROOM" to room.id }
                )
            }

            items(checkpoints) { checkpoint ->
                LocationItem(
                    name = checkpoint.displayName,
                    type = "Checkpoint",
                    isMapped = checkpoint.isMapped,
                    isCalibrated = viewModel.hasWifiFingerprint(checkpoint.id),
                    onSetPosition = { onSetPosition("CHECKPOINT", checkpoint.id, checkpoint.blockId, checkpoint.floorId, checkpoint.x, checkpoint.y) },
                    onWifiCalibration = { onWifiCalibration(checkpoint.id, MappingLocationType.CORRIDOR_CHECKPOINT, checkpoint.blockId, checkpoint.floorId, checkpoint.displayName) },
                    onDelete = { itemToDelete = "CHECKPOINT" to checkpoint.id }
                )
            }

            items(facilities) { facility ->
                LocationItem(
                    name = facility.name,
                    type = "Facility",
                    isMapped = facility.isMapped,
                    isCalibrated = viewModel.hasWifiFingerprint(facility.id),
                    onSetPosition = { onSetPosition("FACILITY", facility.id, facility.blockId, facility.floorId, facility.x, facility.y) },
                    onWifiCalibration = { onWifiCalibration(facility.id, MappingLocationType.valueOf(facility.type.name), facility.blockId, facility.floorId, facility.name) },
                    onDelete = { itemToDelete = "FACILITY" to facility.id }
                )
            }
        }
    }
}

@Composable
fun LocationItem(
    name: String,
    type: String,
    isMapped: Boolean,
    isCalibrated: Boolean,
    onSetPosition: () -> Unit,
    onWifiCalibration: () -> Unit,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(text = name, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(text = type, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isMapped) "✓ Position" else "○ No Position",
                            style = MaterialTheme.typography.labelSmall,
                            color = if (isMapped) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isCalibrated) "✓ Wi-Fi" else "○ No Wi-Fi",
                            style = MaterialTheme.typography.labelSmall,
                            color = if (isCalibrated) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                        )
                    }
                }
                IconButton(onClick = onDelete) {
                    Icon(Icons.Default.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(
                    onClick = onSetPosition,
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(horizontal = 8.dp)
                ) {
                    Text(if (isMapped) "Change Pos" else "Set Position", style = MaterialTheme.typography.labelSmall)
                }
                Button(
                    onClick = onWifiCalibration,
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(horizontal = 8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondaryContainer, contentColor = MaterialTheme.colorScheme.onSecondaryContainer)
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(if (isCalibrated) "Re-Calibrate" else "Calibrate", style = MaterialTheme.typography.labelSmall)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MappingActionCard(
    title: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    ElevatedCard(
        onClick = onClick,
        modifier = modifier.height(80.dp)
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Add, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text(text = title, style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}
