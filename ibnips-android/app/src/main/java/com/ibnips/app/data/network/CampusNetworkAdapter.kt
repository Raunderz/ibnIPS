package com.ibnips.app.data.network

import com.google.gson.Gson
import com.ibnips.app.data.model.NavigationEdge
import com.ibnips.app.data.model.NavigationNode
import com.ibnips.app.data.model.Room
import com.ibnips.app.data.model.RoomType
import com.ibnips.app.data.repository.CampusRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import retrofit2.Response
import java.io.IOException
import java.net.ConnectException
import java.net.NoRouteToHostException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import javax.net.ssl.SSLException

// How a login ended.
sealed interface AuthOutcome {
    data class Success(val auth: AuthResponse) : AuthOutcome
    data class Rejected(val message: String) : AuthOutcome
    data class Unreachable(val reason: String) : AuthOutcome
}

// How a positioning request ended.
//
// The server deliberately distinguishes "nothing matched" (404) from "request
// rejected" and from "could not be asked", because the three mean different
// things to someone standing in a corridor holding a phone.
sealed interface PositionOutcome {
    data class Found(val result: PositionResultDto) : PositionOutcome
    data object NoMatch : PositionOutcome
    data class Rejected(val message: String) : PositionOutcome
    data class Unreachable(val reason: String) : PositionOutcome
}

// Whether the backend can be reached at all, and if not, why not.
//
// Checking this separately from a login attempt is what turns "something went
// wrong" into an answer the user can act on.
sealed interface ConnectionStatus {
    data object Reachable : ConnectionStatus
    data class Unreachable(val reason: String) : ConnectionStatus
}

class CampusNetworkAdapter(
    private val apiService: () -> ApiService,
    private val localRepository: CampusRepository
) {

    private val gson = Gson()

    // GET /api/nodes needs no auth, so it isolates reachability from credentials.
    suspend fun checkConnection(baseUrl: String): ConnectionStatus =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService().getNodes()
                if (response.isSuccessful) {
                    ConnectionStatus.Reachable
                } else {
                    // Reached the server, but it answered with an error. That is
                    // still a working connection.
                    ConnectionStatus.Reachable
                }
            } catch (e: Exception) {
                ConnectionStatus.Unreachable(explain(e))
            }
        }

    suspend fun authenticateUser(email: String, accessKey: String): AuthOutcome =
        withContext(Dispatchers.IO) {
            try {
                val response = apiService().authenticate(AuthRequest(email, accessKey))
                val body = response.body()
                when {
                    response.isSuccessful && body != null -> AuthOutcome.Success(body)
                    response.isSuccessful -> AuthOutcome.Rejected("Server returned no token")
                    else -> AuthOutcome.Rejected(readError(response) ?: "Login failed (HTTP ${response.code()})")
                }
            } catch (e: Exception) {
                AuthOutcome.Unreachable(explain(e))
            }
        }

    suspend fun syncNodesAndMap(): Boolean = withContext(Dispatchers.IO) {
        try {
            val response = apiService().getMap()
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
            val response = apiService().pingLocation(bearer(token), request)
            if (response.isSuccessful) response.body() else null
        } catch (e: Exception) {
            null
        }
    }

    suspend fun requestPosition(
        token: String,
        fingerprints: List<PingFingerprint>
    ): PositionOutcome = withContext(Dispatchers.IO) {
        try {
            val response = apiService().requestPosition(
                bearer(token),
                PositionRequest(fingerprints)
            )
            val body = response.body()
            when {
                response.isSuccessful && body != null -> PositionOutcome.Found(body)
                response.code() == 404 -> PositionOutcome.NoMatch
                else -> PositionOutcome.Rejected(readError(response) ?: "Positioning request failed (HTTP ${response.code()})")
            }
        } catch (e: Exception) {
            PositionOutcome.Unreachable(explain(e))
        }
    }

    private fun bearer(token: String): String =
        if (token.startsWith("Bearer ")) token else "Bearer $token"

    // The backend reports failures as {"error": code, "details": message}. The
    // details are written for a human, so they are worth showing rather than a
    // bare status code.
    private fun readError(response: Response<*>): String? = try {
        val raw = response.errorBody()?.string()
        if (raw.isNullOrBlank()) {
            null
        } else {
            gson.fromJson(raw, ErrorResponse::class.java)?.details?.takeIf { it.isNotBlank() }
        }
    } catch (e: Exception) {
        null
    }

    // A raw exception name tells the user nothing. These are the four ways this
    // actually fails in practice, and each one has a different fix.
    private fun explain(e: Exception): String = when (e) {
        is UnknownHostException ->
            "Server address not found. Check the address and your Wi-Fi."
        is ConnectException ->
            "Nothing is listening on that address. Check the port and that the backend is running."
        is SocketTimeoutException ->
            "The server did not respond in time."
        is NoRouteToHostException ->
            "No route to the server. Check you are on the campus network."
        is SSLException ->
            "Secure connection failed. If the backend is plain HTTP, use an http:// address."
        is IOException ->
            e.message?.takeIf { it.isNotBlank() } ?: "Network error"
        else ->
            e.message?.takeIf { it.isNotBlank() } ?: (e::class.java.simpleName)
    }
}
