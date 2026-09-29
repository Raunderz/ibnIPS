package com.ibnips.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ibnips.app.data.model.*
import com.ibnips.app.ui.viewmodel.CampusViewModel
import java.util.UUID

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MappingReviewScreen(
    viewModel: CampusViewModel,
    blockId: String,
    floorId: String,
    locationType: MappingLocationType,
    details: Map<String, String>,
    x: Float?,
    y: Float?,
    onSaveComplete: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val block = viewModel.blocks.value.find { it.id == blockId }
    val floor = viewModel.getFloors(blockId).find { it.id == floorId }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Review Calibration") },
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
            Text(text = "Summary", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)

            ReviewItem(label = "Block", value = block?.displayName ?: blockId)
            ReviewItem(label = "Floor", value = floor?.displayName ?: floorId)
            ReviewItem(label = "Type", value = locationType.name.replace("_", " "))
            
            details.forEach { (key, value) ->
                ReviewItem(label = key.replaceFirstChar { it.uppercase() }, value = value)
            }

            ReviewItem(
                label = "Map Position",
                value = if (x != null && y != null) "X: $x, Y: $y" else "Not set"
            )
            
            ReviewItem(
                label = "Wi-Fi Fingerprint",
                value = "Pending (Phase 6)"
            )

            Spacer(modifier = Modifier.weight(1f))

            Button(
                onClick = {
                    val locationId = UUID.randomUUID().toString()
                    
                    // Create actual Room or Facility object
                    when (locationType) {
                        MappingLocationType.ROOM -> {
                            val room = Room(
                                id = locationId,
                                blockId = blockId,
                                floorId = floorId,
                                roomNumber = details["roomNumber"] ?: "",
                                displayName = details["displayName"] ?: "",
                                type = RoomType.valueOf(details["roomType"] ?: "OTHER"),
                                x = x ?: 0f,
                                y = y ?: 0f,
                                isMapped = true
                            )
                            viewModel.addRoom(room)
                        }
                        else -> {
                            // Map generic mapping type to FacilityType if possible, or just default
                            val facility = Facility(
                                id = locationId,
                                blockId = blockId,
                                floorId = floorId,
                                name = details["displayName"] ?: locationType.name,
                                type = FacilityType.OTHER, // Simplified for Phase 5
                                x = x ?: 0f,
                                y = y ?: 0f
                            )
                            viewModel.addFacility(facility)
                        }
                    }

                    // Create Calibration Point
                    val calibrationPoint = CalibrationPoint(
                        id = UUID.randomUUID().toString(),
                        blockId = blockId,
                        floorId = floorId,
                        locationType = locationType,
                        locationId = locationId,
                        x = x,
                        y = y,
                        isCalibrated = false // Requires Wi-Fi in Phase 6
                    )
                    viewModel.addCalibrationPoint(calibrationPoint)
                    
                    onSaveComplete()
                },
                modifier = Modifier.fillMaxWidth().height(56.dp)
            ) {
                Icon(Icons.Default.Check, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Save Location")
            }
        }
    }
}

@Composable
private fun ReviewItem(label: String, value: String) {
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Text(text = label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
        Text(text = value, style = MaterialTheme.typography.bodyLarge)
    }
}
