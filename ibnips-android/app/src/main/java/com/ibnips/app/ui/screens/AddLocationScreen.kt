package com.ibnips.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ibnips.app.data.model.MappingLocationType
import com.ibnips.app.data.model.RoomType
import com.ibnips.app.ui.viewmodel.CampusViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddLocationScreen(
    viewModel: CampusViewModel,
    initialType: MappingLocationType? = null,
    onNavigateToReview: (
        blockId: String,
        floorId: String,
        type: MappingLocationType,
        details: Map<String, String>
    ) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val blocks by viewModel.blocks
    var selectedBlockId by remember { mutableStateOf(blocks.firstOrNull()?.id ?: "") }
    var selectedFloorId by remember { mutableStateOf("") }
    var locationType by remember { mutableStateOf(initialType ?: MappingLocationType.ROOM) }
    
    // Details states
    var roomNumber by remember { mutableStateOf("") }
    var displayName by remember { mutableStateOf("") }
    var roomType by remember { mutableStateOf(RoomType.CLASSROOM) }
    var checkpointId by remember { mutableStateOf("") }
    
    var showError by remember { mutableStateOf<String?>(null) }

    val floors = viewModel.getFloors(selectedBlockId)
    
    // Initialize selectedFloorId if empty or block changed
    LaunchedEffect(selectedBlockId) {
        if (selectedFloorId.isEmpty() || !floors.any { it.id == selectedFloorId }) {
            selectedFloorId = floors.firstOrNull()?.id ?: ""
        }
    }

    // Sync locationType if initialType changes from parent
    LaunchedEffect(initialType) {
        if (initialType != null) {
            locationType = initialType
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Add Location") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = modifier
                .padding(innerPadding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(text = "Step 1: Campus Context", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            
            // Block Selector
            Column {
                Text(text = "Select Block", style = MaterialTheme.typography.labelMedium)
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    blocks.forEach { block ->
                        FilterChip(
                            selected = selectedBlockId == block.id,
                            onClick = { selectedBlockId = block.id; showError = null },
                            label = { Text(block.displayName) }
                        )
                    }
                }
            }

            // Floor Selector
            Column {
                Text(text = "Select Floor", style = MaterialTheme.typography.labelMedium)
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    floors.forEach { floor ->
                        FilterChip(
                            selected = selectedFloorId == floor.id,
                            onClick = { selectedFloorId = floor.id; showError = null },
                            label = { Text(floor.displayName) }
                        )
                    }
                }
            }

            HorizontalDivider()

            Text(text = "Step 2: Location Details", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

            // Location Type Selector
            var expandedType by remember { mutableStateOf(false) }
            ExposedDropdownMenuBox(
                expanded = expandedType,
                onExpandedChange = { expandedType = !expandedType }
            ) {
                OutlinedTextField(
                    value = locationType.name.replace("_", " "),
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Location Type") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedType) },
                    modifier = Modifier.fillMaxWidth().menuAnchor()
                )
                ExposedDropdownMenu(
                    expanded = expandedType,
                    onDismissRequest = { expandedType = false }
                ) {
                    MappingLocationType.entries.forEach { type ->
                        DropdownMenuItem(
                            text = { Text(type.name.replace("_", " ")) },
                            onClick = {
                                locationType = type
                                expandedType = false
                                showError = null
                            }
                        )
                    }
                }
            }

            // Fields based on Type
            when (locationType) {
                MappingLocationType.ROOM -> {
                    OutlinedTextField(
                        value = roomNumber,
                        onValueChange = { roomNumber = it; showError = null },
                        label = { Text("Room Number (e.g., A204)") },
                        modifier = Modifier.fillMaxWidth(),
                        isError = showError != null && (roomNumber.isEmpty() || showError!!.contains("exists"))
                    )
                    OutlinedTextField(
                        value = displayName,
                        onValueChange = { displayName = it },
                        label = { Text("Display Name (Optional)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    
                    var expandedRoomType by remember { mutableStateOf(false) }
                    ExposedDropdownMenuBox(
                        expanded = expandedRoomType,
                        onExpandedChange = { expandedRoomType = !expandedRoomType }
                    ) {
                        OutlinedTextField(
                            value = roomType.name,
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Room Type") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedRoomType) },
                            modifier = Modifier.fillMaxWidth().menuAnchor()
                        )
                        ExposedDropdownMenu(
                            expanded = expandedRoomType,
                            onDismissRequest = { expandedRoomType = false }
                        ) {
                            RoomType.entries.forEach { type ->
                                DropdownMenuItem(
                                    text = { Text(type.name) },
                                    onClick = {
                                        roomType = type
                                        expandedRoomType = false
                                    }
                                )
                            }
                        }
                    }
                }
                MappingLocationType.CORRIDOR_CHECKPOINT -> {
                    OutlinedTextField(
                        value = checkpointId,
                        onValueChange = { checkpointId = it; showError = null },
                        label = { Text("Checkpoint ID (e.g., A-F2-C01)") },
                        modifier = Modifier.fillMaxWidth(),
                        isError = showError != null && checkpointId.isEmpty()
                    )
                    OutlinedTextField(
                        value = displayName,
                        onValueChange = { displayName = it },
                        label = { Text("Display Name (Optional)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                else -> {
                    OutlinedTextField(
                        value = displayName,
                        onValueChange = { displayName = it; showError = null },
                        label = { Text("Display Name") },
                        modifier = Modifier.fillMaxWidth(),
                        isError = showError != null && displayName.isEmpty()
                    )
                }
            }

            if (showError != null) {
                Text(
                    text = showError!!,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            Spacer(modifier = Modifier.weight(1f))
            
            Button(
                onClick = {
                    // Validation
                    if (selectedBlockId.isEmpty()) {
                        showError = "Block is required"
                        return@Button
                    }
                    if (selectedFloorId.isEmpty()) {
                        showError = "Floor is required"
                        return@Button
                    }
                    if (locationType == MappingLocationType.ROOM) {
                        if (roomNumber.isEmpty()) {
                            showError = "Room number is required"
                            return@Button
                        }
                        if (viewModel.isRoomExists(selectedBlockId, selectedFloorId, roomNumber)) {
                            showError = "Room $roomNumber already exists on this floor"
                            return@Button
                        }
                    } else if (locationType == MappingLocationType.CORRIDOR_CHECKPOINT) {
                        if (checkpointId.isEmpty()) {
                            showError = "Checkpoint ID is required"
                            return@Button
                        }
                    } else {
                        if (displayName.isEmpty()) {
                            showError = "Display name is required"
                            return@Button
                        }
                    }

                    val details = mutableMapOf<String, String>()
                    details["displayName"] = displayName.ifEmpty { 
                        if (locationType == MappingLocationType.ROOM) "Room $roomNumber" 
                        else if (locationType == MappingLocationType.CORRIDOR_CHECKPOINT) "Checkpoint $checkpointId"
                        else locationType.name.replace("_", " ")
                    }
                    if (locationType == MappingLocationType.ROOM) {
                        details["roomNumber"] = roomNumber
                        details["roomType"] = roomType.name
                    } else if (locationType == MappingLocationType.CORRIDOR_CHECKPOINT) {
                        details["checkpointId"] = checkpointId
                    }
                    
                    onNavigateToReview(selectedBlockId, selectedFloorId, locationType, details)
                },
                modifier = Modifier.fillMaxWidth().height(56.dp)
            ) {
                Text("Review Registration")
            }
        }
    }
}
