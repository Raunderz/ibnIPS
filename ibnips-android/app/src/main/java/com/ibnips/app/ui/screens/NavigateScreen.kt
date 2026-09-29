package com.ibnips.app.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ibnips.app.data.model.NavigationNode
import com.ibnips.app.domain.navigation.RoutePreference
import com.ibnips.app.ui.components.CampusMapView
import com.ibnips.app.ui.viewmodel.CampusViewModel
import com.ibnips.app.ui.viewmodel.IndoorPositioningViewModel
import com.ibnips.app.ui.viewmodel.NavigationViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NavigateScreen(
    campusViewModel: CampusViewModel,
    positioningViewModel: IndoorPositioningViewModel,
    navigationViewModel: NavigationViewModel,
    modifier: Modifier = Modifier
) {
    val currentLocation by positioningViewModel.currentLocation.collectAsState()
    val calculatedRoute by navigationViewModel.calculatedRoute.collectAsState()
    val destinationNode by navigationViewModel.destinationNode.collectAsState()
    val routePreference by navigationViewModel.routePreference.collectAsState()

    var showDestinationPicker by remember { mutableStateOf(false) }
    var scale by remember { mutableFloatStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }

    val rooms = campusViewModel.getAllRooms()
    val facilities = campusViewModel.getAllFacilities()
    val checkpoints = campusViewModel.getAllCheckpoints()
    
    val allDestinations = (rooms.map { it.id to (it.displayName) } +
            facilities.map { it.id to it.name } +
            checkpoints.map { it.id to it.displayName })
        .filter { it.second.isNotEmpty() }

    Column(modifier = modifier.fillMaxSize()) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Navigate",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )
                
                Spacer(modifier = Modifier.height(16.dp))

                Text(text = "From", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Info,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = if (currentLocation != null) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = currentLocation?.let { "${it.displayName} (${it.blockId} • ${it.floorId})" } 
                            ?: "Current location unavailable",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    if (currentLocation == null) {
                        Spacer(modifier = Modifier.weight(1f))
                        TextButton(onClick = { positioningViewModel.startPositioning() }) {
                            Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Locate")
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Text(text = "To", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                OutlinedCard(
                    onClick = { showDestinationPicker = true },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = destinationNode?.let { node ->
                                rooms.find { it.nodeId == node.id }?.displayName 
                                    ?: facilities.find { it.nodeId == node.id }?.name
                                    ?: checkpoints.find { it.id == node.id }?.displayName
                                    ?: "Target Location"
                            } ?: "Select Destination",
                            modifier = Modifier.weight(1f)
                        )
                        Icon(Icons.Default.KeyboardArrowDown, contentDescription = null)
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    RoutePreference.entries.forEach { pref ->
                        FilterChip(
                            selected = routePreference == pref,
                            onClick = { navigationViewModel.setRoutePreference(pref) },
                            label = { Text(pref.name.replace("_", " ").lowercase().capitalize()) }
                        )
                    }
                }

                if (currentLocation != null && destinationNode != null && calculatedRoute == null) {
                    Button(
                        onClick = { 
                            val startNodeId = rooms.find { it.id == currentLocation?.locationId }?.nodeId
                                ?: facilities.find { it.id == currentLocation?.locationId }?.nodeId
                                ?: checkpoints.find { it.id == currentLocation?.locationId }?.id
                            
                            if (startNodeId != null) {
                                val node = campusViewModel.getNavigationNode(startNodeId)
                                navigationViewModel.setStartNode(node)
                            }
                        },
                        modifier = Modifier.fillMaxWidth().padding(top = 16.dp)
                    ) {
                        Text("Calculate Route")
                    }
                }
            }
        }

        Box(modifier = Modifier.weight(1f)) {
            val displayBlockId = currentLocation?.blockId ?: destinationNode?.blockId ?: "block_a"
            val displayFloorId = currentLocation?.floorId ?: destinationNode?.floorId ?: "block_a_g"
            
            val currentFloorRouteNodes = calculatedRoute?.nodeIds?.mapNotNull { id ->
                campusViewModel.getNavigationNode(id)
            }?.filter { it.blockId == displayBlockId && it.floorId == displayFloorId } ?: emptyList()

            CampusMapView(
                scale = scale,
                offset = offset,
                onTransform = { s, o -> scale = s; offset = o },
                rooms = campusViewModel.getRooms(displayBlockId, displayFloorId),
                facilities = campusViewModel.getFacilities(displayBlockId, displayFloorId),
                checkpoints = campusViewModel.getCheckpoints(displayBlockId, displayFloorId),
                userLocation = if (currentLocation?.blockId == displayBlockId && currentLocation?.floorId == displayFloorId) 
                    Offset(currentLocation!!.x, currentLocation!!.y) else null,
                destinationLocation = if (destinationNode?.blockId == displayBlockId && destinationNode?.floorId == displayFloorId)
                    Offset(destinationNode!!.x, destinationNode!!.y) else null,
                routeNodes = currentFloorRouteNodes,
                modifier = Modifier.fillMaxSize()
            )

            // Fix for AnimatedVisibility scope ambiguity by using Box content alignment
            if (calculatedRoute != null) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.BottomCenter) {
                    calculatedRoute?.let { route ->
                        Card(
                            modifier = Modifier.padding(16.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f))
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(text = "Route Summary", fontWeight = FontWeight.Bold)
                                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                    Column {
                                        Text(text = "Distance", style = MaterialTheme.typography.labelSmall)
                                        Text(text = "${route.totalDistance.toInt()} m", fontWeight = FontWeight.Bold)
                                    }
                                    Column {
                                        Text(text = "Time", style = MaterialTheme.typography.labelSmall)
                                        Text(text = "${route.estimatedTimeMinutes} min", fontWeight = FontWeight.Bold)
                                    }
                                    if (route.crossesFloor) {
                                        Column {
                                            Text(text = "Floors", style = MaterialTheme.typography.labelSmall)
                                            Text(text = "Multi", fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                                if (route.usesLift) {
                                    Text(text = "• Take Lift to destination floor", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                                } else if (route.usesStairs) {
                                    Text(text = "• Take Stairs to destination floor", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showDestinationPicker) {
        AlertDialog(
            onDismissRequest = { showDestinationPicker = false },
            title = { Text("Select Destination") },
            text = {
                if (allDestinations.isEmpty()) {
                    Text("No destinations available. Map some locations in Admin mode first.")
                } else {
                    LazyColumn(modifier = Modifier.heightIn(max = 400.dp)) {
                        items(allDestinations) { (id, name) ->
                            TextButton(
                                onClick = {
                                    val nodeId = rooms.find { it.id == id }?.nodeId
                                        ?: facilities.find { it.id == id }?.nodeId
                                        ?: checkpoints.find { it.id == id }?.id
                                    
                                    if (nodeId != null) {
                                        val node = campusViewModel.getNavigationNode(nodeId)
                                        navigationViewModel.setDestinationNode(node)
                                    }
                                    showDestinationPicker = false
                                },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(text = name, modifier = Modifier.fillMaxWidth())
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showDestinationPicker = false }) {
                    Text("Close")
                }
            }
        )
    }
}

private fun String.capitalize() = this.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
