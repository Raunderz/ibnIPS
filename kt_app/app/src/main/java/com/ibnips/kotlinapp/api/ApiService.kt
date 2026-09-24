package com.ibnips.kotlinapp.api

import com.ibnips.kotlinapp.wifi.WifiResult
import com.google.gson.annotations.SerializedName
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

/**
 * Retrofit service contract matching backend/schema.md.
 */
interface ApiService {

    /**
     * POST /api/auth
     * Generate an auth token. Email must end with @kiit.ac.in.
     */
    @POST("api/auth")
    suspend fun authenticate(
        @Body request: AuthRequest
    ): Response<AuthResponse>

    /**
     * POST /api/ping
     * Creates a node (room) and its Wi-Fi fingerprints, and links to previous node via edge.
     */
    @POST("api/ping")
    suspend fun ping(
        @Header("Authorization") authHeader: String?,
        @Body request: PingRequest
    ): Response<PingResponse>

    /**
     * GET /api/nodes
     * List all nodes.
     */
    @GET("api/nodes")
    suspend fun getNodes(): Response<List<BackendNode>>

    /**
     * GET /api/map
     * Full graph (nodes + edges) for rendering map.
     */
    @GET("api/map")
    suspend fun getMap(): Response<MapResponse>

    /**
     * POST /api/position
     * Optional backend position localization.
     */
    @POST("api/position")
    suspend fun fetchPosition(
        @Header("Authorization") authHeader: String?,
        @Body request: PositionRequest
    ): Response<PositionResponse>

    /**
     * Fetch remote configuration if the backend exposes one.
     */
    @GET("config")
    suspend fun getRemoteConfig(): Response<ApiEnvelope<RemoteConfigResponse>>

    /**
     * Send a Wi-Fi scan batch to the backend.
     */
    @POST("wifi/scans")
    suspend fun postWifiScan(
        @Body request: WifiScanRequest
    ): Response<ApiEnvelope<WifiScanAckResponse>>

    /**
     * Send a position update batch to the backend.
     */
    @POST("position/update")
    suspend fun postPositionUpdate(
        @Body request: PositionUpdateRequest
    ): Response<ApiEnvelope<PositionUpdateAckResponse>>

    /**
     * Standard health check (legacy/utility).
     */
    @GET("health")
    suspend fun getHealth(): Response<ApiEnvelope<HealthResponse>>
}

// --- Request & Response Models (matching backend/schema.md) ---

data class AuthRequest(
    @SerializedName("email") val email: String
)

data class AuthResponse(
    @SerializedName("token") val token: String? = null,
    @SerializedName("error") val error: String? = null,
    @SerializedName("details") val details: String? = null
)

data class PingRequest(
    @SerializedName("name") val name: String,
    @SerializedName("floor") val floor: Int,
    @SerializedName("previous_node_id") val previousNodeId: String = "",
    @SerializedName("steps") val steps: Int = -1,
    @SerializedName("direction") val direction: String = "",
    @SerializedName("fingerprints") val fingerprints: List<BackendFingerprint> = emptyList()
)

data class PingResponse(
    @SerializedName("status") val status: String? = null,
    @SerializedName("node_id") val nodeId: String? = null,
    @SerializedName("error") val error: String? = null,
    @SerializedName("details") val details: String? = null
)

data class BackendNode(
    @SerializedName("node_id") val nodeId: String,
    @SerializedName("name") val name: String,
    @SerializedName("floor") val floor: Int,
    @SerializedName("x") val x: Float = 0f,
    @SerializedName("y") val y: Float = 0f
)

data class BackendEdge(
    @SerializedName("from_node") val fromNode: String,
    @SerializedName("to_node") val toNode: String,
    @SerializedName("steps") val steps: Int,
    @SerializedName("direction") val direction: String
)

data class MapResponse(
    @SerializedName("nodes") val nodes: List<BackendNode> = emptyList(),
    @SerializedName("edges") val edges: List<BackendEdge> = emptyList(),
    @SerializedName("error") val error: String? = null,
    @SerializedName("details") val details: String? = null
)

data class BackendFingerprint(
    @SerializedName("bssid") val bssid: String,
    @SerializedName("ssid") val ssid: String,
    @SerializedName("rssi") val rssi: Int
)

data class PositionRequest(
    @SerializedName("fingerprints") val fingerprints: List<BackendFingerprint>
)

data class PositionResponse(
    @SerializedName("node_id") val nodeId: String? = null,
    @SerializedName("name") val name: String? = null,
    @SerializedName("floor") val floor: Int? = null,
    @SerializedName("confidence") val confidence: Int? = null
)

// Legacy envelope and models kept for internal app compatibility
data class ApiEnvelope<T>(
    @SerializedName("success") val success: Boolean = false,
    @SerializedName("message") val message: String? = null,
    @SerializedName("data") val data: T? = null,
    @SerializedName("errorCode") val errorCode: String? = null,
    @SerializedName("timestamp") val timestamp: Long? = null
)

data class HealthResponse(
    @SerializedName("status") val status: String = "unknown",
    @SerializedName("version") val version: String? = null,
    @SerializedName("uptimeMs") val uptimeMs: Long? = null
)

data class RemoteConfigResponse(
    @SerializedName("apiBaseUrl") val apiBaseUrl: String? = null,
    @SerializedName("mockModeEnabled") val mockModeEnabled: Boolean? = null,
    @SerializedName("wifiScanIntervalMs") val wifiScanIntervalMs: Long? = null,
    @SerializedName("positionUpdateIntervalMs") val positionUpdateIntervalMs: Long? = null
)

data class WifiScanRequest(
    @SerializedName("sessionId") val sessionId: String,
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("mockMode") val mockMode: Boolean,
    @SerializedName("capturedAt") val capturedAt: Long,
    @SerializedName("results") val results: List<WifiResultPayload>
)

data class PositionUpdateRequest(
    @SerializedName("sessionId") val sessionId: String,
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("mockMode") val mockMode: Boolean,
    @SerializedName("capturedAt") val capturedAt: Long,
    @SerializedName("latitude") val latitude: Double,
    @SerializedName("longitude") val longitude: Double,
    @SerializedName("accuracy") val accuracy: Float? = null,
    @SerializedName("wifiResults") val wifiResults: List<WifiResultPayload> = emptyList()
)

data class WifiResultPayload(
    @SerializedName("ssid") val ssid: String,
    @SerializedName("bssid") val bssid: String,
    @SerializedName("rssi") val rssi: Int,
    @SerializedName("frequency") val frequency: Int,
    @SerializedName("timestamp") val timestamp: Long
)

data class WifiScanAckResponse(
    @SerializedName("scanId") val scanId: String? = null,
    @SerializedName("accepted") val accepted: Boolean = false,
    @SerializedName("receivedCount") val receivedCount: Int = 0
)

data class PositionUpdateAckResponse(
    @SerializedName("updateId") val updateId: String? = null,
    @SerializedName("accepted") val accepted: Boolean = false,
    @SerializedName("receivedAt") val receivedAt: Long? = null
)

fun WifiResult.toPayload(): WifiResultPayload {
    return WifiResultPayload(
        ssid = ssid,
        bssid = bssid,
        rssi = rssi,
        frequency = frequency,
        timestamp = timestamp
    )
}

fun WifiResult.toBackendFingerprint(): BackendFingerprint {
    return BackendFingerprint(
        ssid = ssid,
        bssid = bssid,
        rssi = rssi
    )
}
