package com.ibnips.app.domain.navigation

import com.ibnips.app.data.model.NavigationNode
import com.ibnips.app.data.model.Route
import java.util.PriorityQueue

class Pathfinder(private val graph: NavigationGraph) {

    fun findPath(
        startNodeId: String,
        destinationNodeId: String,
        preference: RoutePreference = RoutePreference.SHORTEST
    ): Route? {
        if (startNodeId == destinationNodeId) {
            graph.getNode(startNodeId) ?: return null
            return Route(
                nodeIds = listOf(startNodeId),
                totalDistance = 0f,
                estimatedTimeMinutes = 0,
                usesStairs = false,
                usesLift = false,
                crossesFloor = false,
                isAccessible = true
            )
        }

        val startNode = graph.getNode(startNodeId) ?: return null
        val destNode = graph.getNode(destinationNodeId) ?: return null

        val openSet = PriorityQueue<NodeScore>(compareBy { it.fScore })
        val cameFrom = mutableMapOf<String, String>()
        
        val gScore = mutableMapOf<String, Float>().withDefault { Float.MAX_VALUE }
        gScore[startNodeId] = 0f
        
        val fScore = mutableMapOf<String, Float>().withDefault { Float.MAX_VALUE }
        val startFScore = graph.calculateHeuristic(startNode, destNode)
        fScore[startNodeId] = startFScore
        
        openSet.add(NodeScore(startNodeId, startFScore))

        while (openSet.isNotEmpty()) {
            val nodeScore = openSet.poll()!!
            val current = nodeScore.nodeId
            
            if (current == destinationNodeId) {
                return reconstructPath(cameFrom, current, gScore.getValue(current))
            }

            // Optimization: if we've already found a better path to this node, skip it
            if (nodeScore.fScore > fScore.getValue(current)) continue

            for (edge in graph.getNeighbors(current, preference)) {
                val neighborId = edge.toNodeId
                val cost = graph.getEdgeCost(edge, preference)
                val tentativeGScore = gScore.getValue(current) + cost
                
                if (tentativeGScore < gScore.getValue(neighborId)) {
                    cameFrom[neighborId] = current
                    gScore[neighborId] = tentativeGScore
                    val neighborNode = graph.getNode(neighborId)!!
                    val neighborFScore = tentativeGScore + graph.calculateHeuristic(neighborNode, destNode)
                    fScore[neighborId] = neighborFScore
                    
                    openSet.add(NodeScore(neighborId, neighborFScore))
                }
            }
        }

        return null
    }

    private fun reconstructPath(cameFrom: Map<String, String>, currentId: String, totalDistance: Float): Route {
        val path = mutableListOf<String>()
        var curr: String? = currentId
        while (curr != null) {
            path.add(0, curr)
            curr = cameFrom[curr]
        }

        var usesStairs = false
        var usesLift = false
        var crossesFloor = false
        var isAccessible = true

        for (i in 0 until path.size - 1) {
            val from = path[i]
            val to = path[i+1]
            
            // Find the edge that connects these two nodes
            // In the graph, we might have multiple edges between same nodes (e.g. lift and stairs)
            // The pathfinder would have chosen the one with lower cost based on preference.
            // For metadata, we just check properties of available edges.
            val edges = graph.edges.filter { 
                (it.fromNodeId == from && it.toNodeId == to) || 
                (it.isBidirectional && it.fromNodeId == to && it.toNodeId == from) 
            }
            
            // If there's an edge with lift, assume we use it if possible.
            // This is a simplification.
            if (edges.any { it.floorChange }) crossesFloor = true
            if (edges.any { it.allowsStairs && !it.allowsLift && it.floorChange }) usesStairs = true
            if (edges.any { it.allowsLift && it.floorChange }) usesLift = true
            if (edges.all { !it.accessible }) isAccessible = false
        }

        return Route(
            nodeIds = path,
            totalDistance = totalDistance,
            estimatedTimeMinutes = (totalDistance / 1.4f / 60f).toInt().coerceAtLeast(1),
            usesStairs = usesStairs,
            usesLift = usesLift,
            crossesFloor = crossesFloor,
            isAccessible = isAccessible
        )
    }

    private data class NodeScore(val nodeId: String, val fScore: Float)
}
