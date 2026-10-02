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
import com.ibnips.app.data.model.FacilityType
import com.ibnips.app.ui.viewmodel.CampusViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddFacilityScreen(
    viewModel: CampusViewModel,
    onContinue: (blockId: String, floorId: String, facilityType: FacilityType, displayName: String) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val blocks by viewModel.blocks
    var selectedBlockId by remember { mutableStateOf(blocks.firstOrNull()?.id ?: "") }
    var selectedFloorId by remember { mutableStateOf("") }
    
    var facilityType by remember { mutableStateOf(FacilityType.OTHER) }
    var displayName by remember { mutableStateOf("") }
    
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
            title = { Text("Review Facility Details") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Block: ${blocks.find { it.id == selectedBlockId }?.displayName ?: selectedBlockId}")
                    Text("Floor: ${floors.find { it.id == selectedFloorId }?.displayName ?: selectedFloorId}")
                    Text("Facility Type: ${facilityType.name}")
                    Text("Display Name: $displayName")
                }
            },
            confirmButton = {
                Button(onClick = { 
                    showPreview = false
                    onContinue(selectedBlockId, selectedFloorId, facilityType, displayName)
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
                title = { Text("Add Facility") },
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

            Text(text = "Facility Details", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

            var expandedFacilityType by remember { mutableStateOf(false) }
            ExposedDropdownMenuBox(
                expanded = expandedFacilityType,
                onExpandedChange = { expandedFacilityType = !expandedFacilityType }
            ) {
                OutlinedTextField(
                    value = facilityType.name,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Facility Type") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedFacilityType) },
                    modifier = Modifier.fillMaxWidth().menuAnchor()
                )
                ExposedDropdownMenu(
                    expanded = expandedFacilityType,
                    onDismissRequest = { expandedFacilityType = false }
                ) {
                    FacilityType.entries.forEach { type ->
                        DropdownMenuItem(
                            text = { Text(type.name) },
                            onClick = {
                                facilityType = type
                                expandedFacilityType = false
                            }
                        )
                    }
                }
            }

            OutlinedTextField(
                value = displayName,
                onValueChange = { displayName = it; showError = null },
                label = { Text("Display Name") },
                modifier = Modifier.fillMaxWidth(),
                isError = showError != null && displayName.isEmpty()
            )

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
                        if (displayName.isEmpty()) {
                            showError = "Display name is required"
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
