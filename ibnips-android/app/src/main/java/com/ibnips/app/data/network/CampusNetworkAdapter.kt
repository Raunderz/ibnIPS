package com.ibnips.app.data.network

import com.ibnips.app.data.model.NavigationNode
import com.ibnips.app.data.model.NavigationEdge
import com.ibnips.app.data.model.Room
import com.ibnips.app.data.model.RoomType
import com.ibnips.app.data.repository.CampusRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class CampusNetworkAdapter(
    private val apiService: ApiService,
    private val localRepository: CampusRepository
) {

    suspend fun authenticateUser(email: String): AuthResponse? = withContext(Dispatchers.IO) {
        try {
            val response = apiService.authenticate(AuthRequest(email))
            if (response.isSuccessful) response.body() else null
        } catch (e: Exception) {
            null
        }
    }

    suspend fun syncNodesAndMap(): Boolean = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getMap()
            if (response.isSuccessful && response.body() != null) {
                val mapData = response.body()!!
                
                // Sync remote nodes into local fallback repository safely
                mapData.nodes.forEach { dto ->
                    val node = NavigationNode(
                        id = dto.nodeId,
                        blockId = "block_a", // Default block grouping if not specified by backend
                        floorId = "block_a_f${dto.floor}",
                        x = dto.x.toFloat(),
                        y = dto.y.toFloat(),
                        type = com.ibnips.app.data.model.NavigationNodeType.ROOM
                    )
                    localRepository.addNavigationNode(node)

                    // Dynamically map a Room object locally if it matches names
                    localRepository.addRoom(
                        Room(
                            id = dto.nodeId,
                            blockId = "block_a",
                            floorId = "block_a_f${dto.floor}",
                            roomNumber = dto.name,
                            displayName = dto.name,
                            type = RoomType.CLASSROOM,
                            x = dto.x.toFloat(),
                            y = dto.y.toFloat(),
                            nodeId = dto.nodeId,
                            isMapped = true
                        )
                    )
                }

                // Sync remote edges into local fallback repository safely
                mapData.edges.forEach { dto ->
                    val edge = NavigationEdge(
                        id = "${dto.fromNode}_${dto.toNode}",
                        fromNodeId = dto.fromNode,
                        toNodeId = dto.toNode,
                        distance = dto.steps.toFloat(),
                        isBidirectional = true,
                        accessible = true,
                        allowsStairs = true,
                        allowsLift = true,
                        blockChange = false,
                        floorChange = false
                    )
                    localRepository.addNavigationEdge(edge)
                }
                true
            } else {
                false
            }
        } catch (e: Exception) {
            false // Fallback gracefully on backend network disruption
        }
    }

    suspend fun pingLocationUpdate(token: String, request: PingRequest): PingResponse? = withContext(Dispatchers.IO) {
        try {
            val bearerToken = if (token.startsWith("Bearer ")) token else "Bearer $token"
            val response = apiService.pingLocation(bearerToken, request)
            if (response.isSuccessful) response.body() else null
        } catch (e: Exception) {
            null
        }
    }
}
