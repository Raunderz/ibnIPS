package com.ibnips.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import com.ibnips.app.data.model.NavigationNode

@Composable
fun RouteLayer(
    nodes: List<NavigationNode>,
    modifier: Modifier = Modifier
) {
    if (nodes.size < 2) return

    Canvas(modifier = modifier.fillMaxSize()) {
        val path = Path().apply {
            val firstNode = nodes.first()
            moveTo(firstNode.x, firstNode.y)
            
            for (i in 1 until nodes.size) {
                val node = nodes[i]
                lineTo(node.x, node.y)
            }
        }

        drawPath(
            path = path,
            color = Color(0xFF0074D9), // Blue accent from theme
            style = Stroke(
                width = 4.dp.toPx(),
                cap = StrokeCap.Round,
                join = StrokeJoin.Round
            )
        )
        
        // Draw small circles at each node point for better visibility
        nodes.forEach { node ->
            drawCircle(
                color = Color(0xFF0074D9),
                radius = 4.dp.toPx(),
                center = Offset(node.x, node.y)
            )
        }
    }
}
