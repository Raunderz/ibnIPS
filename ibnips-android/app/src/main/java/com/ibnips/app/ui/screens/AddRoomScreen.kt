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
import com.ibnips.app.data.model.RoomType
import com.ibnips.app.ui.viewmodel.CampusViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddRoomScreen(
    viewModel: CampusViewModel,
    onContinue: (blockId: String, floorId: String, roomNumber: String, displayName: String, roomType: RoomType) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val blocks by viewModel.blocks
    var selectedBlockId by remember { mutableStateOf(blocks.firstOrNull()?.id ?: "") }
    var selectedFloorId by remember { mutableStateOf("") }
    
    var roomNumber by remember { mutableStateOf("") }
    var displayName by remember { mutableStateOf("") }
    var roomType by remember { mutableStateOf(RoomType.CLASSROOM) }
    
    var showError by remember { mutableStateOf<String?>(null) }
    var showPreview by remember { mutableStateOf(false) }

    val floors = viewModel.getFloors(selectedBlockId)
    LaunchedEffect(selectedBlockId) {
        if (selectedFloorId.isEmpty() || !floors.any { it.id == selectedFloorId }) {
            selectedFloorId = floors.firstOrNull()?.id ?: ""
        }
    }

    if (showPreview) {
        AlertDialog(
            onDismissRequest = { showPreview = false },
            title = { Text("Review Room Details") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Block: ${blocks.find { it.id == selectedBlockId }?.displayName ?: selectedBlockId}")
                    Text("Floor: ${floors.find { it.id == selectedFloorId }?.displayName ?: selectedFloorId}")
                    Text("Room Number: $roomNumber")
                    Text("Display Name: $displayName")
                    Text("Room Type: ${roomType.name}")
                }
            },
            confirmButton = {
                Button(onClick = { 
                    showPreview = false
                    onContinue(selectedBlockId, selectedFloorId, roomNumber, displayName, roomType)
                }) {
                    Text("Confirm & Save")
                }
            },
            dismissButton = {
                TextButton(onClick = { showPreview = false }) {
                    Text("Edit")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Add Room") },
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
            Text(text = "Location Context", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            
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

            Text(text = "Room Details", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

            OutlinedTextField(
                value = roomNumber,
                onValueChange = { roomNumber = it; showError = null },
                label = { Text("Room Number (e.g., A204)") },
                modifier = Modifier.fillMaxWidth(),
                isError = showError != null && roomNumber.isEmpty()
            )

            OutlinedTextField(
                value = displayName,
                onValueChange = { displayName = it },
                label = { Text("Display Name") },
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

            if (showError != null) {
                Text(
                    text = showError!!,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            Spacer(modifier = Modifier.weight(1f))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                OutlinedButton(
                    onClick = onBack,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Cancel")
                }
                Button(
                    onClick = {
                        if (roomNumber.isEmpty()) {
                            showError = "Room number is required"
                            return@Button
                        }
                        if (displayName.isEmpty()) {
                            showError = "Display name is required"
                            return@Button
                        }
                        if (viewModel.isRoomExists(selectedBlockId, selectedFloorId, roomNumber)) {
                            showError = "Room $roomNumber already exists on this floor"
                            return@Button
                        }
                        showPreview = true
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Continue")
                }
            }
        }
    }
}
