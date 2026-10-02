package com.ibnips.app.domain.navigation

import com.ibnips.app.data.model.NavigationEdge
import com.ibnips.app.data.model.NavigationNode
import kotlin.math.sqrt

class NavigationGraph(
    val nodes: List<NavigationNode>,
    val edges: List<NavigationEdge>
) {
    private val adjacencyList = mutableMapOf<String, MutableList<NavigationEdge>>()

    init {
        for (edge in edges) {
            adjacencyList.getOrPut(edge.fromNodeId) { mutableListOf() }.add(edge)
            if (edge.isBidirectional) {
                val reverseEdge = edge.copy(
                    id = "${edge.id}_rev",
                    fromNodeId = edge.toNodeId,
                    toNodeId = edge.fromNodeId
                )
                adjacencyList.getOrPut(edge.toNodeId) { mutableListOf() }.add(reverseEdge)
            }
        }
    }

    fun getNeighbors(nodeId: String, preference: RoutePreference): List<NavigationEdge> {
        val allNeighbors = adjacencyList[nodeId] ?: emptyList()
        return when (preference) {
            RoutePreference.SHORTEST -> allNeighbors
            RoutePreference.ACCESSIBLE -> allNeighbors.filter { it.accessible }
            RoutePreference.AVOID_STAIRS -> allNeighbors
        }
    }

    fun getEdgeCost(edge: NavigationEdge, preference: RoutePreference): Float {
        val distance = edge.distance ?: calculateDistance(edge.fromNodeId, edge.toNodeId) ?: 0f
        var cost = distance
        
        if (preference == RoutePreference.AVOID_STAIRS && edge.allowsStairs && !edge.allowsLift && edge.floorChange) {
            // Apply heavy penalty for stairs if avoid stairs is selected
            cost *= 100f
        }
        return cost
    }

    private fun calculateDistance(fromNodeId: String, toNodeId: String): Float? {
        val fromNode = getNode(fromNodeId) ?: return null
        val toNode = getNode(toNodeId) ?: return null
        
        // Only calculate distance from coordinates if nodes are on the same floor
        return if (fromNode.floorId == toNode.floorId && fromNode.blockId == toNode.blockId) {
            val dx = fromNode.x - toNode.x
            val dy = fromNode.y - toNode.y
            sqrt(dx * dx + dy * dy)
        } else {
            null
        }
    }

    fun getNode(id: String): NavigationNode? = nodes.find { it.id == id }

    fun calculateHeuristic(fromNode: NavigationNode, toNode: NavigationNode): Float {
        // Only use Euclidean distance as heuristic if nodes are on the same floor
        return if (fromNode.floorId == toNode.floorId && fromNode.blockId == toNode.blockId) {
            val dx = fromNode.x - toNode.x
            val dy = fromNode.y - toNode.y
            sqrt(dx * dx + dy * dy)
        } else {
            // For different floors/blocks, we don't have a reliable geometric heuristic
            0f
        }
    }
}
