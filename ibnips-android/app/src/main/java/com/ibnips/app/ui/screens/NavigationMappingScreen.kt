package com.ibnips.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.ibnips.app.data.model.*
import com.ibnips.app.ui.components.CampusMapView
import com.ibnips.app.ui.components.FloorSelector
import com.ibnips.app.ui.theme.*
import com.ibnips.app.ui.viewmodel.CampusViewModel
import java.util.UUID

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NavigationMappingScreen(
    viewModel: CampusViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedBlockId by remember { mutableStateOf("block_a") }
    var selectedFloorId by remember { mutableStateOf("block_a_g") }
    
    var scale by remember { mutableFloatStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }
    
    var selectedNodeId by remember { mutableStateOf<String?>(null) }
    var showNodeDialog by remember { mutableStateOf(false) }
    var tapPosition by remember { mutableStateOf<Offset?>(null) }
    
    var showEdgeDialog by remember { mutableStateOf(false) }
    var edgeFromNodeId by remember { mutableStateOf<String?>(null) }

    val blocks by viewModel.blocks
    val floors = viewModel.getFloors(selectedBlockId)
    
    val allNodes = viewModel.getAllNavigationNodes().filter { it.blockId == selectedBlockId && it.floorId == selectedFloorId }
    val allEdges = viewModel.getNavigationEdges().filter { edge ->
        val from = viewModel.getNavigationNode(edge.fromNodeId)
        val to = viewModel.getNavigationNode(edge.toNodeId)
        from?.blockId == selectedBlockId && from?.floorId == selectedFloorId &&
        to?.blockId == selectedBlockId && to?.floorId == selectedFloorId
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Text(
                        "Navigation Mapping", 
                        fontWeight = FontWeight.Black,
                        color = PrimaryBlue
                    ) 
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = PrimaryBlue)
                    }
                },
                actions = {
                    if (selectedNodeId != null) {
                        IconButton(onClick = {
                            selectedNodeId = null
                            edgeFromNodeId = null
                        }) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear Selection", tint = PrimaryBlue)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = SurfaceWhite
                )
            )
        },
        containerColor = BackgroundTint
    ) { innerPadding ->
        Column(modifier = modifier.padding(innerPadding).fillMaxSize()) {
            // Context Info & Building Selection Card
            Card(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            color = PrimaryBlue.copy(alpha = 0.1f),
                            shape = CircleShape,
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                Icons.Default.Info, 
                                contentDescription = null, 
                                tint = PrimaryBlue,
                                modifier = Modifier.padding(6.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            "Tap map to place node | Select to connect",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            "Building:",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = PrimaryBlue
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(blocks) { block ->
                                FilterChip(
                                    selected = selectedBlockId == block.id,
                                    onClick = { 
                                        selectedBlockId = block.id
                                        selectedFloorId = viewModel.getFloors(block.id).firstOrNull()?.id ?: ""
                                        selectedNodeId = null
                                    },
                                    label = { Text(block.displayName) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = PrimaryBlue.copy(alpha = 0.1f),
                                        selectedLabelColor = PrimaryBlue
                                    )
                                )
                            }
                        }
                    }
                }
            }
            
            FloorSelector(
                floors = floors,
                selectedFloorId = selectedFloorId,
                onFloorSelected = { floor ->
                    selectedFloorId = floor.id
                    selectedNodeId = null
                    edgeFromNodeId = null
                }
            )

            Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .pointerInput(scale, offset) {
                            detectTapGestures { screenOffset ->
                                val mapX = (screenOffset.x - offset.x) / scale
                                val mapY = (screenOffset.y - offset.y) / scale
                                
                                // Check if tapped near an existing node
                                val clickedNode = allNodes.find { node ->
                                    val dx = node.x - mapX
                                    val dy = node.y - mapY
                                    (dx * dx + dy * dy) < (24 * 24 / (scale * scale))
                                }
                                
                                if (clickedNode != null) {
                                    selectedNodeId = clickedNode.id
                                } else {
                                    tapPosition = Offset(mapX, mapY)
                                    showNodeDialog = true
                                }
                            }
                        }
                ) {
                    CampusMapView(
                        scale = scale,
                        offset = offset,
                        onTransform = { s, o -> scale = s; offset = o },
                        rooms = viewModel.getRooms(selectedBlockId, selectedFloorId),
                        facilities = viewModel.getFacilities(selectedBlockId, selectedFloorId),
                        checkpoints = viewModel.getCheckpoints(selectedBlockId, selectedFloorId),
                        allNavigationNodes = allNodes,
                        allNavigationEdges = allEdges,
                        selectedNodeId = selectedNodeId
                    )
                }
                
                // Polished Action Overlay for selected node
                selectedNodeId?.let { nodeId ->
                    val node = viewModel.getNavigationNode(nodeId)
                    if (node != null) {
                        Surface(
                            modifier = Modifier
                                .align(Alignment.BottomCenter)
                                .padding(16.dp)
                                .fillMaxWidth(),
                            shape = RoundedCornerShape(24.dp),
                            tonalElevation = 8.dp,
                            color = SurfaceWhite,
                            border = androidx.compose.foundation.BorderStroke(1.dp, PrimaryBlue.copy(alpha = 0.1f))
                        ) {
                            Column(modifier = Modifier.padding(20.dp)) {
                                val nodeColor = when (node.type) {
                                    NavigationNodeType.CORRIDOR -> NodeCorridor
                                    NavigationNodeType.JUNCTION -> NodeJunction
                                    NavigationNodeType.STAIRS -> NodeStairs
                                    NavigationNodeType.LIFT -> NodeLift
                                    NavigationNodeType.ENTRANCE -> NodeEntrance
                                    NavigationNodeType.EXIT -> NodeExit
                                    else -> NodeFacility
                                }
                                
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Surface(
                                        color = nodeColor,
                                        shape = CircleShape,
                                        modifier = Modifier.size(12.dp)
                                    ) {}
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Text(
                                        text = "${node.type} Node",
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Black
                                    )
                                    Spacer(modifier = Modifier.weight(1f))
                                    Text(
                                        text = "Coord: ${node.x.toInt()}, ${node.y.toInt()}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.outline
                                    )
                                }
                                
                                Spacer(modifier = Modifier.height(20.dp))
                                
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Button(
                                        onClick = { 
                                            edgeFromNodeId = nodeId
                                            showEdgeDialog = true
                                        },
                                        modifier = Modifier.weight(1f),
                                        shape = RoundedCornerShape(12.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = PrimaryBlue)
                                    ) {
                                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("Link Edge")
                                    }
                                    OutlinedButton(
                                        onClick = {
                                            val isReferenced = viewModel.getAllRooms().any { it.nodeId == nodeId } ||
                                                              viewModel.getAllFacilities().any { it.nodeId == nodeId }
                                            if (!isReferenced) {
                                                viewModel.deleteNavigationNode(nodeId)
                                                selectedNodeId = null
                                            }
                                        },
                                        modifier = Modifier.weight(1f),
                                        colors = ButtonDefaults.outlinedButtonColors(contentColor = ErrorRed),
                                        border = androidx.compose.foundation.BorderStroke(1.dp, ErrorRed.copy(alpha = 0.5f)),
                                        shape = RoundedCornerShape(12.dp)
                                    ) {
                                        Icon(Icons.Default.Delete, contentDescription = null, modifier = Modifier.size(18.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("Delete")
                                    }
                                }
                                
                                val nodeEdges = allEdges.filter { it.fromNodeId == nodeId || it.toNodeId == nodeId }
                                if (nodeEdges.isNotEmpty()) {
                                    Spacer(modifier = Modifier.height(20.dp))
                                    Text(
                                        "Connected Links",
                                        style = MaterialTheme.typography.labelLarge,
                                        fontWeight = FontWeight.Bold,
                                        color = PrimaryBlue
                                    )
                                    LazyColumn(
                                        modifier = Modifier.heightIn(max = 120.dp),
                                        contentPadding = PaddingValues(vertical = 8.dp)
                                    ) {
                                        items(nodeEdges) { edge ->
                                            val otherNodeId = if (edge.fromNodeId == nodeId) edge.toNodeId else edge.fromNodeId
                                            val otherNode = viewModel.getNavigationNode(otherNodeId)
                                            Card(
                                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                                colors = CardDefaults.cardColors(containerColor = BackgroundTint),
                                                shape = RoundedCornerShape(12.dp)
                                            ) {
                                                Row(
                                                    modifier = Modifier.padding(12.dp),
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.SpaceBetween
                                                ) {
                                                    Column {
                                                        Text(
                                                            "To ${otherNode?.type ?: "Unknown"}",
                                                            style = MaterialTheme.typography.bodyMedium,
                                                            fontWeight = FontWeight.Bold
                                                        )
                                                        Text(
                                                            "${edge.distance ?: "Auto"}m | ${if(edge.accessible) "Accessible" else "Standard"}",
                                                            style = MaterialTheme.typography.labelSmall,
                                                            color = MaterialTheme.colorScheme.outline
                                                        )
                                                    }
                                                    IconButton(onClick = { viewModel.deleteNavigationEdge(edge.id) }) {
                                                        Icon(Icons.Default.Delete, contentDescription = "Remove", tint = ErrorRed, modifier = Modifier.size(20.dp))
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showNodeDialog && tapPosition != null) {
        NodeCreationDialog(
            onDismiss = { showNodeDialog = false },
            onConfirm = { type ->
                val node = NavigationNode(
                    id = UUID.randomUUID().toString(),
                    blockId = selectedBlockId,
                    floorId = selectedFloorId,
                    type = type,
                    x = tapPosition!!.x,
                    y = tapPosition!!.y
                )
                viewModel.addNavigationNode(node)
                showNodeDialog = false
            }
        )
    }

    if (showEdgeDialog && edgeFromNodeId != null) {
        EdgeCreationDialog(
            nodes = allNodes.filter { it.id != edgeFromNodeId },
            onDismiss = { showEdgeDialog = false },
            onConfirm = { toNodeId, distance, accessible, stairs, lift, floorChange ->
                val edge = NavigationEdge(
                    id = UUID.randomUUID().toString(),
                    fromNodeId = edgeFromNodeId!!,
                    toNodeId = toNodeId,
                    distance = distance,
                    accessible = accessible,
                    allowsStairs = stairs,
                    allowsLift = lift,
                    floorChange = floorChange
                )
                viewModel.addNavigationEdge(edge)
                showEdgeDialog = false
            }
        )
    }
}

@Composable
fun NodeCreationDialog(onDismiss: () -> Unit, onConfirm: (NavigationNodeType) -> Unit) {
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(28.dp), 
            tonalElevation = 12.dp, 
            color = SurfaceWhite
        ) {
            Column(modifier = Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "New Navigation Point", 
                    style = MaterialTheme.typography.headlineSmall, 
                    fontWeight = FontWeight.Black,
                    color = PrimaryBlue
                )
                Text(
                    "Select node classification for this map position:",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = MaterialTheme.colorScheme.outlineVariant)
                
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    NavigationNodeType.entries.forEach { type ->
                        val color = when (type) {
                            NavigationNodeType.CORRIDOR -> NodeCorridor
                            NavigationNodeType.JUNCTION -> NodeJunction
                            NavigationNodeType.STAIRS -> NodeStairs
                            NavigationNodeType.LIFT -> NodeLift
                            NavigationNodeType.ENTRANCE -> NodeEntrance
                            NavigationNodeType.EXIT -> NodeExit
                            else -> NodeFacility
                        }
                        
                        Surface(
                            onClick = { onConfirm(type) },
                            shape = RoundedCornerShape(12.dp),
                            color = color.copy(alpha = 0.08f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, color.copy(alpha = 0.15f))
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(modifier = Modifier.size(10.dp).background(color, CircleShape))
                                Spacer(modifier = Modifier.width(16.dp))
                                Text(type.name, fontWeight = FontWeight.ExtraBold, color = color)
                            }
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(12.dp))
                TextButton(onClick = onDismiss, modifier = Modifier.align(Alignment.End)) {
                    Text("Cancel", color = MaterialTheme.colorScheme.outline)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EdgeCreationDialog(
    nodes: List<NavigationNode>,
    onDismiss: () -> Unit,
    onConfirm: (String, Float?, Boolean, Boolean, Boolean, Boolean) -> Unit
) {
    var selectedToNodeId by remember { mutableStateOf<String?>(null) }
    var distanceStr by remember { mutableStateOf("") }
    var accessible by remember { mutableStateOf(true) }
    var allowsStairs by remember { mutableStateOf(true) }
    var allowsLift by remember { mutableStateOf(true) }
    var floorChange by remember { mutableStateOf(false) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(28.dp), 
            tonalElevation = 12.dp, 
            color = SurfaceWhite
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .verticalScroll(rememberScrollState()), 
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    "Link Route Points", 
                    style = MaterialTheme.typography.headlineSmall, 
                    fontWeight = FontWeight.Black,
                    color = PrimaryBlue
                )
                
                Text(
                    "Configure navigation path between selected nodes.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                
                Text(
                    "Select Destination Node:",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.ExtraBold
                )
                
                Box(
                    modifier = Modifier
                        .heightIn(max = 180.dp)
                        .background(BackgroundTint, shape = RoundedCornerShape(16.dp))
                        .padding(4.dp)
                ) {
                    LazyColumn {
                        items(nodes) { node ->
                            ListItem(
                                headlineContent = { 
                                    Text(
                                        "${node.type} at (${node.x.toInt()}, ${node.y.toInt()})",
                                        fontWeight = FontWeight.Bold
                                    ) 
                                },
                                modifier = Modifier.clickable { selectedToNodeId = node.id },
                                colors = if (selectedToNodeId == node.id) 
                                    ListItemDefaults.colors(containerColor = PrimaryBlue.copy(alpha = 0.1f)) 
                                else ListItemDefaults.colors(containerColor = Color.Transparent)
                            )
                        }
                    }
                }
                
                OutlinedTextField(
                    value = distanceStr,
                    onValueChange = { distanceStr = it },
                    label = { Text("Link Distance (meters)") },
                    placeholder = { Text("Leave blank for auto-calc") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
                    )
                )
                
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    PropertySwitch(label = "Accessible Route", checked = accessible, onCheckedChange = { accessible = it })
                    PropertySwitch(label = "Allows Stairs", checked = allowsStairs, onCheckedChange = { allowsStairs = it })
                    PropertySwitch(label = "Allows Lift", checked = allowsLift, onCheckedChange = { allowsLift = it })
                    PropertySwitch(label = "Floor Change Link", checked = floorChange, onCheckedChange = { floorChange = it })
                }
                
                Spacer(modifier = Modifier.height(12.dp))
                
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = onDismiss) { Text("Cancel", color = MaterialTheme.colorScheme.outline) }
                    Spacer(modifier = Modifier.width(12.dp))
                    Button(
                        onClick = {
                            if (selectedToNodeId != null) {
                                onConfirm(selectedToNodeId!!, distanceStr.toFloatOrNull(), accessible, allowsStairs, allowsLift, floorChange)
                            }
                        },
                        enabled = selectedToNodeId != null,
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Connect Nodes")
                    }
                }
            }
        }
    }
}

@Composable
fun PropertySwitch(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(BackgroundTint, RoundedCornerShape(12.dp))
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}
