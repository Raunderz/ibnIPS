package com.ibnips.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.rememberTransformableState
import androidx.compose.foundation.gestures.transformable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ibnips.app.data.model.*
import com.ibnips.app.ui.theme.*
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke

@Composable
fun CampusMapView(
    scale: Float,
    offset: Offset,
    onTransform: (Float, Offset) -> Unit,
    rooms: List<Room>,
    facilities: List<Facility>,
    checkpoints: List<Checkpoint> = emptyList(),
    userLocation: Offset? = null,
    destinationLocation: Offset? = null,
    routeNodes: List<NavigationNode> = emptyList(),
    allNavigationNodes: List<NavigationNode> = emptyList(),
    allNavigationEdges: List<NavigationEdge> = emptyList(),
    selectedNodeId: String? = null,
    modifier: Modifier = Modifier
) {
    val state = rememberTransformableState { zoomChange, offsetChange, _ ->
        val newScale = (scale * zoomChange).coerceIn(0.5f, 5.0f)
        val newOffset = offset + offsetChange
        onTransform(newScale, newOffset)
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .transformable(state = state)
    ) {
        // Map Container experiencing zoom & pan via graphicsLayer
        Box(
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer(
                    scaleX = scale,
                    scaleY = scale,
                    translationX = offset.x,
                    translationY = offset.y
                )
        ) {
            // LAYER 1: Background & Blueprint Info
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.align(Alignment.Center).padding(16.dp)
            ) {
                Text(
                    text = "Indoor Digital Map",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.2f)
                )
            }

            // LAYER 2: Admin Navigation Edges
            if (allNavigationEdges.isNotEmpty()) {
                Canvas(modifier = Modifier.fillMaxSize()) {
                    allNavigationEdges.forEach { edge ->
                        val from = allNavigationNodes.find { it.id == edge.fromNodeId }
                        val to = allNavigationNodes.find { it.id == edge.toNodeId }
                        if (from != null && to != null) {
                            val edgeColor = when {
                                edge.allowsLift -> NodeLift
                                edge.allowsStairs && !edge.accessible -> NodeStairs
                                edge.accessible -> PrimaryBlue
                                else -> Color.Gray
                            }
                            
                            drawLine(
                                color = edgeColor.copy(alpha = 0.6f),
                                start = Offset(from.x, from.y),
                                end = Offset(to.x, to.y),
                                strokeWidth = 2.dp.toPx(),
                                cap = StrokeCap.Round
                            )
                        }
                    }
                }
            }

            // LAYER 2.5: Route Rendering (Draw under markers)
            if (routeNodes.isNotEmpty()) {
                RouteLayer(nodes = routeNodes)
            }

            // LAYER 3: Rooms rendering
            for (room in rooms) {
                if (room.isMapped) {
                    Box(
                        modifier = Modifier
                            .graphicsLayer(
                                translationX = room.x,
                                translationY = room.y
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                imageVector = Icons.Default.LocationOn,
                                contentDescription = null,
                                tint = PrimaryBlue,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = room.roomNumber,
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.DarkGray,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.background(Color.White.copy(alpha = 0.8f), shape = MaterialTheme.shapes.extraSmall).padding(horizontal = 2.dp)
                            )
                        }
                    }
                }
            }

            // LAYER 4: Facilities rendering
            for (facility in facilities) {
                if (facility.isMapped) {
                    Box(
                        modifier = Modifier
                            .graphicsLayer(
                                translationX = facility.x,
                                translationY = facility.y
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                imageVector = Icons.Default.Place,
                                contentDescription = null,
                                tint = SecondaryCyan,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = facility.name,
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.DarkGray,
                                modifier = Modifier.background(Color.White.copy(alpha = 0.8f), shape = MaterialTheme.shapes.extraSmall).padding(horizontal = 2.dp)
                            )
                        }
                    }
                }
            }

            // LAYER 5: Checkpoints rendering
            for (checkpoint in checkpoints) {
                if (checkpoint.isMapped) {
                    Box(
                        modifier = Modifier
                            .graphicsLayer(
                                translationX = checkpoint.x,
                                translationY = checkpoint.y
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = null,
                            tint = WarningAmber,
                            modifier = Modifier.size(12.dp)
                        )
                    }
                }
            }

            // LAYER 5.5: Admin Navigation Nodes
            for (node in allNavigationNodes) {
                Box(
                    modifier = Modifier
                        .graphicsLayer(
                            translationX = node.x,
                            translationY = node.y
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    val isSelected = node.id == selectedNodeId
                    val nodeColor = when (node.type) {
                        NavigationNodeType.CORRIDOR -> NodeCorridor
                        NavigationNodeType.JUNCTION -> NodeJunction
                        NavigationNodeType.STAIRS -> NodeStairs
                        NavigationNodeType.LIFT -> NodeLift
                        NavigationNodeType.ENTRANCE -> NodeEntrance
                        NavigationNodeType.EXIT -> NodeExit
                        else -> NodeFacility
                    }
                    
                    Canvas(modifier = Modifier.size(12.dp)) {
                        drawCircle(
                            color = nodeColor,
                            radius = 6.dp.toPx()
                        )
                        if (isSelected) {
                            drawCircle(
                                color = Color.White,
                                radius = 3.dp.toPx()
                            )
                            drawCircle(
                                color = nodeColor,
                                radius = 8.dp.toPx(),
                                style = Stroke(width = 2.dp.toPx())
                            )
                        }
                    }
                }
            }

            // LAYER 6: Destination Marker
            destinationLocation?.let { dest ->
                Box(
                    modifier = Modifier
                        .graphicsLayer(
                            translationX = dest.x,
                            translationY = dest.y
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    DestinationMarker()
                }
            }

            // LAYER 7: User Location rendering
            userLocation?.let { loc ->
                Box(
                    modifier = Modifier
                        .graphicsLayer(
                            translationX = loc.x,
                            translationY = loc.y
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    CurrentLocationMarker()
                }
            }

            // LAYER 8: Generic indicator if nothing is mapped
            if (rooms.none { it.isMapped } && facilities.none { it.isMapped } && checkpoints.none { it.isMapped } && userLocation == null && routeNodes.isEmpty() && allNavigationNodes.isEmpty()) {
                Text(
                    text = "Map Canvas Ready",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.3f),
                    modifier = Modifier.align(Alignment.Center).padding(top = 80.dp)
                )
            }
        }
    }
}
