package com.ibnips.app.ui.screens

import androidx.compose.foundation.clickable
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
import com.ibnips.app.ui.components.FloorSelector
import com.ibnips.app.ui.viewmodel.CampusViewModel
import com.ibnips.app.ui.viewmodel.IndoorPositioningViewModel
import com.ibnips.app.ui.viewmodel.NavigationViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NavigationScreen(
    campusViewModel: CampusViewModel,
    positioningViewModel: IndoorPositioningViewModel,
    navigationViewModel: NavigationViewModel,
    modifier: Modifier = Modifier
) {
    val currentLocation by positioningViewModel.currentLocation.collectAsState()
    val calculatedRoute by navigationViewModel.calculatedRoute.collectAsState()
    val destinationNode by navigationViewModel.destinationNode.collectAsState()
    val routePreference by navigationViewModel.routePreference.collectAsState()
    
    // Phase 8C: Navigation State Observers
    val navigationState by navigationViewModel.navigationState.collectAsState()
    val currentInstruction by navigationViewModel.currentInstruction.collectAsState()
    val remainingDistance by navigationViewModel.remainingDistance.collectAsState()
    val estimatedTimeRemaining by navigationViewModel.estimatedTimeRemaining.collectAsState()

    var showDestinationPicker by remember { mutableStateOf(false) }
    var scale by remember { mutableFloatStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }

    // Aggregate all mapped destinations for picker
    val rooms = campusViewModel.getAllRooms().filter { it.isMapped }
    val facilities = campusViewModel.getAllFacilities().filter { it.isMapped }
    val checkpoints = campusViewModel.getAllCheckpoints().filter { it.isMapped }
    
    val allDestinations = (rooms.map { it.id to (it.displayName) } +
            facilities.map { it.id to it.name } +
            checkpoints.map { it.id to it.displayName })
        .filter { it.second.isNotEmpty() }

    // Track which floor to display on the map
    var displayBlockId by remember { mutableStateOf("block_a") }
    var displayFloorId by remember { mutableStateOf("block_a_g") }

    // Sync display floor with current location or route start
    LaunchedEffect(currentLocation, navigationState) {
        val loc = currentLocation
        if (loc != null) {
            // During navigation or if no route, follow the user's floor
            if (calculatedRoute == null || 
                navigationState == NavigationViewModel.NavigationState.NAVIGATING ||
                navigationState == NavigationViewModel.NavigationState.OFF_ROUTE ||
                navigationState == NavigationViewModel.NavigationState.REROUTING) {
                
                displayBlockId = loc.blockId
                displayFloorId = loc.floorId
            }
        }
    }

    // Phase 8C: Stop navigation on disposal
    DisposableEffect(Unit) {
        onDispose {
            navigationViewModel.stopNavigation()
        }
    }

    Column(modifier = modifier.fillMaxSize()) {
        // Upper UI: Route Selection and Summary
        // Hide selection UI during active navigation to focus on the map
        if (navigationState == NavigationViewModel.NavigationState.IDLE || 
            navigationState == NavigationViewModel.NavigationState.ROUTE_FOUND ||
            navigationState == NavigationViewModel.NavigationState.CALCULATING) {
            
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Navigate",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    
                    Spacer(modifier = Modifier.height(12.dp))

                    // From Location
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
                                Text("Scan")
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // To Destination
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
                                        ?: "Mapped Location"
                                } ?: "Select Destination",
                                modifier = Modifier.weight(1f),
                                style = MaterialTheme.typography.bodyMedium
                            )
                            Icon(Icons.Default.KeyboardArrowDown, contentDescription = null)
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    
                    // Preferences
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        RoutePreference.entries.forEach { pref ->
                            FilterChip(
                                selected = routePreference == pref,
                                onClick = { navigationViewModel.setRoutePreference(pref) },
                                label = { Text(pref.name.replace("_", " ").lowercase().replaceFirstChar { it.uppercase() }) }
                            )
                        }
                    }

                    // Calculate Action
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
                            modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
                        ) {
                            if (navigationState == NavigationViewModel.NavigationState.CALCULATING) {
                                CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
                            } else {
                                Text("Calculate Route")
                            }
                        }
                    }
                }
            }
        }

        // Map View Area
        Box(modifier = Modifier.weight(1f)) {
            val floors = campusViewModel.getFloors(displayBlockId)
            
            Column(modifier = Modifier.fillMaxSize()) {
                FloorSelector(
                    floors = floors,
                    selectedFloorId = displayFloorId,
                    onFloorSelected = { floor ->
                        displayFloorId = floor.id
                        scale = 1f
                        offset = Offset.Zero
                    }
                )

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
                    modifier = Modifier.weight(1f)
                )
            }

            // Route Summary and Live Guidance Overlay
            if (calculatedRoute != null || navigationState == NavigationViewModel.NavigationState.DESTINATION_REACHED) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.BottomCenter) {
                    Card(
                        modifier = Modifier.padding(16.dp).fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f)),
                        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            when (navigationState) {
                                NavigationViewModel.NavigationState.ROUTE_FOUND -> {
                                    calculatedRoute?.let { route ->
                                        Text(text = "Route Summary", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                                            SummaryItem(label = "Distance", value = "${route.totalDistance.toInt()} m")
                                            SummaryItem(label = "Time", value = "${route.estimatedTimeMinutes} min")
                                            SummaryItem(label = "Accessible", value = if (route.isAccessible) "Yes" else "No")
                                        }
                                        
                                        if (route.crossesFloor) {
                                            Spacer(modifier = Modifier.height(8.dp))
                                            val icon = if (route.usesLift) "Lift" else "Stairs"
                                            Text(
                                                text = "• Multi-floor route: Use $icon to navigate floors.",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.primary
                                            )
                                        }
                                        
                                        Button(
                                            onClick = { navigationViewModel.startNavigation(positioningViewModel) },
                                            modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
                                        ) {
                                            Text("Start Navigation")
                                        }
                                    }
                                }
                                
                                NavigationViewModel.NavigationState.NAVIGATING,
                                NavigationViewModel.NavigationState.OFF_ROUTE,
                                NavigationViewModel.NavigationState.REROUTING -> {
                                    val statusText = when (navigationState) {
                                        NavigationViewModel.NavigationState.OFF_ROUTE -> "Off Route"
                                        NavigationViewModel.NavigationState.REROUTING -> "Rerouting..."
                                        else -> "Navigating to ${destinationNode?.id ?: "Destination"}"
                                    }
                                    
                                    Text(
                                        text = statusText,
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = if (navigationState == NavigationViewModel.NavigationState.OFF_ROUTE) 
                                            MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
                                    )
                                    
                                    Spacer(modifier = Modifier.height(8.dp))
                                    
                                    Text(
                                        text = currentInstruction.ifEmpty { "Follow the highlighted path" },
                                        style = MaterialTheme.typography.bodyLarge,
                                        color = MaterialTheme.colorScheme.primary,
                                        fontWeight = FontWeight.Medium
                                    )
                                    
                                    Spacer(modifier = Modifier.height(12.dp))
                                    
                                    Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                                        SummaryItem(label = "Remaining", value = "${remainingDistance.toInt()} m")
                                        SummaryItem(label = "Est. Time", value = "$estimatedTimeRemaining min")
                                        SummaryItem(label = "Floor", value = currentLocation?.floorId?.last()?.toString() ?: "-")
                                    }
                                    
                                    OutlinedButton(
                                        onClick = { navigationViewModel.stopNavigation() },
                                        modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
                                    ) {
                                        Text("Stop Navigation")
                                    }
                                }
                                
                                NavigationViewModel.NavigationState.DESTINATION_REACHED -> {
                                    Text(
                                        text = "Destination Reached",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "You have arrived at ${destinationNode?.id ?: "your destination"}.",
                                        style = MaterialTheme.typography.bodyMedium
                                    )
                                    Button(
                                        onClick = { navigationViewModel.clearNavigation() },
                                        modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
                                    ) {
                                        Text("Done")
                                    }
                                }
                                
                                else -> {
                                    // Handle intermediate states like CALCULATING
                                    Text(text = "Updating route...", style = MaterialTheme.typography.bodyMedium)
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
                    Text("No mapped destinations available. Use Admin mode to add rooms or facilities.")
                } else {
                    LazyColumn(modifier = Modifier.heightIn(max = 300.dp)) {
                        items(allDestinations) { (id, name) ->
                            ListItem(
                                headlineContent = { Text(name) },
                                modifier = Modifier.clickable {
                                    val nodeId = rooms.find { it.id == id }?.nodeId
                                        ?: facilities.find { it.id == id }?.nodeId
                                        ?: checkpoints.find { it.id == id }?.id
                                    
                                    if (nodeId != null) {
                                        val node = campusViewModel.getNavigationNode(nodeId)
                                        navigationViewModel.setDestinationNode(node)
                                    }
                                    showDestinationPicker = false
                                }
                            )
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showDestinationPicker = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
private fun SummaryItem(label: String, value: String) {
    Column {
        Text(text = label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
        Text(text = value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
    }
}
