package com.ibnips.app

import com.ibnips.app.data.model.NavigationEdge
import com.ibnips.app.data.model.NavigationNode
import com.ibnips.app.data.model.NavigationNodeType
import com.ibnips.app.domain.navigation.NavigationGraph
import com.ibnips.app.domain.navigation.Pathfinder
import com.ibnips.app.domain.navigation.RoutePreference
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PathfinderTest {

    @Test
    fun `test shortest path between three nodes`() {
        // A --(10)-- B --(10)-- C
        // A --(5)-- D --(5)-- C
        
        val nodes = listOf(
            NavigationNode("A", "B1", "F0", NavigationNodeType.CORRIDOR, 0f, 0f),
            NavigationNode("B", "B1", "F0", NavigationNodeType.CORRIDOR, 10f, 0f),
            NavigationNode("C", "B1", "F0", NavigationNodeType.CORRIDOR, 20f, 0f),
            NavigationNode("D", "B1", "F0", NavigationNodeType.CORRIDOR, 10f, 10f)
        )
        
        val edges = listOf(
            NavigationEdge("e1", "A", "B", 10f),
            NavigationEdge("e2", "B", "C", 10f),
            NavigationEdge("e3", "A", "D", 5f),
            NavigationEdge("e4", "D", "C", 5f)
        )
        
        val graph = NavigationGraph(nodes, edges)
        val pathfinder = Pathfinder(graph)
        
        val route = pathfinder.findPath("A", "C", RoutePreference.SHORTEST)
        
        assertNotNull(route)
        assertEquals(listOf("A", "D", "C"), route?.nodeIds)
        assertEquals(10f, route?.totalDistance ?: 0f, 0.01f)
    }

    @Test
    fun `test avoid stairs preference`() {
        // Floor 0 node A
        // Floor 1 node B
        // Edge 1: Stairs (dist 10)
        // Edge 2: Lift (dist 20)
        
        val nodes = listOf(
            NavigationNode("A", "B1", "F0", NavigationNodeType.STAIRS, 0f, 0f),
            NavigationNode("B", "B1", "F1", NavigationNodeType.STAIRS, 0f, 0f),
            NavigationNode("L0", "B1", "F0", NavigationNodeType.LIFT, 10f, 10f),
            NavigationNode("L1", "B1", "F1", NavigationNodeType.LIFT, 10f, 10f)
        )
        
        val edges = listOf(
            // Stairs connection
            NavigationEdge("stairs", "A", "B", 10f, floorChange = true, allowsStairs = true, allowsLift = false),
            // Lift connection (longer distance but accessible/no stairs)
            NavigationEdge("lift", "L0", "L1", 20f, floorChange = true, allowsStairs = false, allowsLift = true),
            // Corridor to lift
            NavigationEdge("c1", "A", "L0", 2f),
            NavigationEdge("c2", "B", "L1", 2f)
        )
        
        val graph = NavigationGraph(nodes, edges)
        val pathfinder = Pathfinder(graph)
        
        // Shortest should take stairs
        val shortestRoute = pathfinder.findPath("A", "B", RoutePreference.SHORTEST)
        assertEquals(listOf("A", "B"), shortestRoute?.nodeIds)
        
        // Avoid stairs should take lift even if longer
        val accessibleRoute = pathfinder.findPath("A", "B", RoutePreference.AVOID_STAIRS)
        assertEquals(listOf("A", "L0", "L1", "B"), accessibleRoute?.nodeIds)
        assertTrue(accessibleRoute!!.totalDistance > shortestRoute!!.totalDistance)
    }

    @Test
    fun `test no route returns null`() {
        val nodes = listOf(
            NavigationNode("A", "B1", "F0", NavigationNodeType.CORRIDOR, 0f, 0f),
            NavigationNode("B", "B1", "F0", NavigationNodeType.CORRIDOR, 10f, 0f)
        )
        val graph = NavigationGraph(nodes, emptyList())
        val pathfinder = Pathfinder(graph)
        
        val route = pathfinder.findPath("A", "B")
        assertEquals(null, route)
    }
}
