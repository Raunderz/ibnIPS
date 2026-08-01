package com.ibnips.kotlinapp.api

import com.ibnips.kotlinapp.wifi.WifiResult
import com.google.gson.annotations.SerializedName
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

/**
 * Retrofit service contract for the native Android layer.
 *
 * Responsibilities:
 * - define the network endpoints used by the repository
 * - keep request and response shapes strongly typed
 * - expose GET and POST operations only, as requested
 *
 * This interface does not contain UI code, React Native code, or backend logic.
 * It only defines the client-side contract that the repository will consume.
 */
interface ApiService {

    /**
     * Lightweight health check used to verify connectivity and server availability.
     */
    @GET("health")
    suspend fun getHealth(): Response<ApiEnvelope<HealthResponse>>

    /**
     * Fetch remote configuration if the backend exposes one.
     * This can be used for runtime settings such as scan tuning or feature flags.
     */
    @GET("config")
    suspend fun getRemoteConfig(): Response<ApiEnvelope<RemoteConfigResponse>>

    /**
     * Send a Wi-Fi scan batch to the backend.
     * This is the main POST endpoint used by the native layer.
     */
    @POST("wifi/scans")
    suspend fun postWifiScan(
        @Body request: WifiScanRequest,
    ): Response<ApiEnvelope<WifiScanAckResponse>>

    /**
     * Send a position update batch to the backend.
     * This supports the background position service flow.
     */
    @POST("position/update")
    suspend fun postPositionUpdate(
        @Body request: PositionUpdateRequest,
    ): Response<ApiEnvelope<PositionUpdateAckResponse>>
}

/**
 * Standard API envelope used by the repository for uniform success/error handling.
 * If the backend uses a different contract, the repository can map it here without
 * changing the rest of the native layer.
 */
data class ApiEnvelope<T>(
    @SerializedName("success")
    val success: Boolean = false,
    @SerializedName("message")
    val message: String? = null,
    @SerializedName("data")
    val data: T? = null,
    @SerializedName("errorCode")
    val errorCode: String? = null,
    @SerializedName("timestamp")
    val timestamp: Long? = null,
)

/**
 * Simple response returned by GET /health.
 */
data class HealthResponse(
    @SerializedName("status")
    val status: String = "unknown",
    @SerializedName("version")
    val version: String? = null,
    @SerializedName("uptimeMs")
    val uptimeMs: Long? = null,
)

/**
 * Remote configuration payload that can drive native behavior.
 */
data class RemoteConfigResponse(
    @SerializedName("apiBaseUrl")
    val apiBaseUrl: String? = null,
    @SerializedName("mockModeEnabled")
    val mockModeEnabled: Boolean? = null,
    @SerializedName("wifiScanIntervalMs")
    val wifiScanIntervalMs: Long? = null,
    @SerializedName("positionUpdateIntervalMs")
    val positionUpdateIntervalMs: Long? = null,
)

/**
 * Batch payload for sending Wi-Fi scan data to the backend.
 *
 * The request is intentionally explicit so the repository can enrich it with
 * device metadata and cached preferences without the UI or bridge knowing about it.
 */
data class WifiScanRequest(
    @SerializedName("sessionId")
    val sessionId: String,
    @SerializedName("deviceId")
    val deviceId: String,
    @SerializedName("mockMode")
    val mockMode: Boolean,
    @SerializedName("capturedAt")
    val capturedAt: Long,
    @SerializedName("results")
    val results: List<WifiResultPayload>,
)

/**
 * Payload sent for periodic position updates.
 */
data class PositionUpdateRequest(
    @SerializedName("sessionId")
    val sessionId: String,
    @SerializedName("deviceId")
    val deviceId: String,
    @SerializedName("mockMode")
    val mockMode: Boolean,
    @SerializedName("capturedAt")
    val capturedAt: Long,
    @SerializedName("latitude")
    val latitude: Double,
    @SerializedName("longitude")
    val longitude: Double,
    @SerializedName("accuracy")
    val accuracy: Float? = null,
    @SerializedName("wifiResults")
    val wifiResults: List<WifiResultPayload> = emptyList(),
)

/**
 * Canonical Wi-Fi result payload sent over the network.
 * This mirrors the local WifiResult model but stays network-friendly.
 */
data class WifiResultPayload(
    @SerializedName("ssid")
    val ssid: String,
    @SerializedName("bssid")
    val bssid: String,
    @SerializedName("rssi")
    val rssi: Int,
    @SerializedName("frequency")
    val frequency: Int,
    @SerializedName("timestamp")
    val timestamp: Long,
)

/**
 * Response returned after Wi-Fi scan upload.
 */
data class WifiScanAckResponse(
    @SerializedName("scanId")
    val scanId: String? = null,
    @SerializedName("accepted")
    val accepted: Boolean = false,
    @SerializedName("receivedCount")
    val receivedCount: Int = 0,
)

/**
 * Response returned after a position update upload.
 */
data class PositionUpdateAckResponse(
    @SerializedName("updateId")
    val updateId: String? = null,
    @SerializedName("accepted")
    val accepted: Boolean = false,
    @SerializedName("receivedAt")
    val receivedAt: Long? = null,
)

/**
 * Convenience mapper so the repository can convert the shared local model to
 * the network payload without duplicating field mappings.
 */
fun WifiResult.toPayload(): WifiResultPayload {
    return WifiResultPayload(
        ssid = ssid,
        bssid = bssid,
        rssi = rssi,
        frequency = frequency,
        timestamp = timestamp,
    )
}

