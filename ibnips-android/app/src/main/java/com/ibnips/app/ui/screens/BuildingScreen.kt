package com.ibnips.app.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SecondaryTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ibnips.app.ui.viewmodel.CampusViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BuildingScreen(
    blockId: String,
    viewModel: CampusViewModel,
    onBack: () -> Unit,
    onViewMap: (String, String) -> Unit,
    modifier: Modifier = Modifier
) {
    val block = viewModel.blocks.value.find { it.id == blockId }
    val floors = viewModel.getFloors(blockId)
    var selectedFloorIndex by remember { mutableIntStateOf(0) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(block?.displayName ?: "Building Detail") },
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
        ) {
            if (floors.isNotEmpty()) {
                SecondaryTabRow(
                    selectedTabIndex = selectedFloorIndex,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    floors.forEachIndexed { index, floor ->
                        Tab(
                            selected = selectedFloorIndex == index,
                            onClick = { selectedFloorIndex = index },
                            text = { Text(floor.displayName) }
                        )
                    }
                }

                val currentFloor = floors[selectedFloorIndex]
                val rooms = viewModel.getRooms(blockId, currentFloor.id)
                val facilities = viewModel.getFacilities(blockId, currentFloor.id)

                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp)
                ) {
                    item {
                        Text(
                            text = "${currentFloor.displayName} Overview",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        
                        Button(
                            onClick = { onViewMap(blockId, currentFloor.id) },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.LocationOn, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("View Floor Map")
                        }
                        
                        Spacer(modifier = Modifier.height(24.dp))
                    }

                    if (rooms.isEmpty() && facilities.isEmpty()) {
                        item {
                            Column(modifier = Modifier.padding(vertical = 32.dp)) {
                                Icon(
                                    imageVector = Icons.Default.Info,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.outline,
                                    modifier = Modifier.padding(bottom = 8.dp)
                                )
                                Text(
                                    text = "No rooms mapped for this floor.",
                                    style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = FontWeight.Medium
                                )
                                Text(
                                    text = "Rooms will appear here after campus mapping.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    } else {
                        items(rooms) { room ->
                            Text(text = "Room: ${room.roomNumber}", modifier = Modifier.padding(vertical = 4.dp))
                        }
                        items(facilities) { facility ->
                            Text(text = "Facility: ${facility.name}", modifier = Modifier.padding(vertical = 4.dp))
                        }
                    }
                }
            } else {
                Text(
                    text = "No floors found for this building.",
                    modifier = Modifier.padding(16.dp)
                )
            }
        }
    }
}
