package com.ibnips.kotlinapp.api

import android.content.Context
import com.ibnips.kotlinapp.mock.MockDataProvider
import com.ibnips.kotlinapp.storage.PreferenceManager
import com.ibnips.kotlinapp.wifi.WifiResult
import com.ibnips.kotlinapp.wifi.WifiScanner
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.ResponseBody
import retrofit2.Response
import java.io.IOException
import java.net.SocketTimeoutException
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository layer for the native Android implementation.
 */
@Singleton
class Repository @Inject constructor(
    private val preferenceManager: PreferenceManager,
    private val wifiScanner: WifiScanner,
    private val mockDataProvider: MockDataProvider,
) {

    private val apiService: ApiService by lazy {
        ApiClient.getRetrofit(preferenceManager).create(ApiService::class.java)
    }

    sealed class DataSource {
        data object LIVE : DataSource()
        data object MOCK : DataSource()
        data object CACHE : DataSource()
        data object REMOTE : DataSource()
    }

    sealed class RepositoryError(open val message: String) {
        data object NoPermission : RepositoryError("Required permissions are missing.")
        data object WifiDisabled : RepositoryError("Wi-Fi is disabled.")
        data object LocationDisabled : RepositoryError("Location is disabled.")
        data object InternetLost : RepositoryError("No internet connection.")
        data object Timeout : RepositoryError("Request timed out.")
        data object ScanFailed : RepositoryError("Wi-Fi scan failed.")
        data object InvalidResponse : RepositoryError("Invalid server response.")

        data class ApiFailure(val code: Int, override val message: String) : RepositoryError(message)
        data class NetworkFailure(override val message: String, val cause: Throwable? = null) : RepositoryError(message)
        data class Unknown(override val message: String, val cause: Throwable? = null) : RepositoryError(message)
    }

    sealed class RepositoryResult<out T> {
        data class Success<T>(val data: T, val source: DataSource, val isStale: Boolean = false) : RepositoryResult<T>()
        data class Error(val error: RepositoryError, val cachedWifiResults: List<WifiResult> = emptyList(), val throwable: Throwable? = null) : RepositoryResult<Nothing>()
    }

    fun isMockModeEnabled(): Boolean = preferenceManager.isMockModeEnabled()
    fun setMockModeEnabled(enabled: Boolean) = preferenceManager.setMockModeEnabled(enabled)
    fun getLastWifiScan(): List<WifiResult> = preferenceManager.getLastScan()
    fun getLastLocation(): PreferenceManager.StoredLocation? = preferenceManager.getLastLocation()

    suspend fun getWifiSnapshot(forceRefresh: Boolean = true): RepositoryResult<List<WifiResult>> {
        return withContext(Dispatchers.IO) {
            if (preferenceManager.isMockModeEnabled()) {
                val results = mockDataProvider.generateWifiResults()
                preferenceManager.saveLastScan(results)
                return@withContext RepositoryResult.Success(results, DataSource.MOCK)
            }

            when (val outcome = wifiScanner.scanNearbyNetworks(forceRefresh = forceRefresh)) {
                is WifiScanner.WifiScanOutcome.Success -> {
                    val results = outcome.results
                    preferenceManager.saveLastScan(results)
                    RepositoryResult.Success(results, if (outcome.fromCache) DataSource.CACHE else DataSource.LIVE, outcome.fromCache)
                }
                is WifiScanner.WifiScanOutcome.Failure -> {
                    val cachedResults = outcome.cachedResults.ifEmpty { preferenceManager.getLastScan() }
                    if (cachedResults.isNotEmpty()) {
                        RepositoryResult.Success(cachedResults, DataSource.CACHE, true)
                    } else {
                        RepositoryResult.Error(mapWifiScanFailure(outcome), cachedResults, outcome.throwable)
                    }
                }
            }
        }
    }

    suspend fun uploadPositionUpdate(
        sessionId: String,
        deviceId: String,
        latitude: Double,
        longitude: Double,
        accuracy: Float? = null,
        forceRefreshWifi: Boolean = false,
    ): RepositoryResult<PositionUpdateAckResponse> {
        return withContext(Dispatchers.IO) {
            val wifiSnapshot = when (val scanResult = getWifiSnapshot(forceRefreshWifi)) {
                is RepositoryResult.Success -> scanResult.data
                is RepositoryResult.Error -> scanResult.cachedWifiResults
            }

            preferenceManager.saveLastLocation(latitude, longitude, accuracy)

            val request = PositionUpdateRequest(
                sessionId = sessionId,
                deviceId = deviceId,
                mockMode = preferenceManager.isMockModeEnabled(),
                capturedAt = System.currentTimeMillis(),
                latitude = latitude,
                longitude = longitude,
                accuracy = accuracy,
                wifiResults = wifiSnapshot.map { it.toPayload() }
            )

            executeNetworkCall { postPositionUpdate(request) }
        }
    }

    suspend fun refreshRemoteConfig(): RepositoryResult<RemoteConfigResponse> {
        return withContext(Dispatchers.IO) {
            val result = executeNetworkCall { getRemoteConfig() }
            if (result is RepositoryResult.Success) {
                applyRemoteConfig(result.data)
            }
            result
        }
    }

    private fun applyRemoteConfig(config: RemoteConfigResponse) {
        config.apiBaseUrl?.takeIf { it.isNotBlank() }?.let(preferenceManager::saveApiBaseUrl)
        config.mockModeEnabled?.let(preferenceManager::setMockModeEnabled)
    }

    suspend fun pingServer(): RepositoryResult<HealthResponse> {
        return withContext(Dispatchers.IO) {
            executeNetworkCall { getHealth() }
        }
    }

    private fun mapWifiScanFailure(failure: WifiScanner.WifiScanOutcome.Failure): RepositoryError {
        return when (failure.reason) {
            WifiScanner.WifiScanFailureReason.PERMISSION_DENIED -> RepositoryError.NoPermission
            WifiScanner.WifiScanFailureReason.WIFI_DISABLED -> RepositoryError.WifiDisabled
            WifiScanner.WifiScanFailureReason.LOCATION_DISABLED -> RepositoryError.LocationDisabled
            WifiScanner.WifiScanFailureReason.TIMEOUT -> RepositoryError.Timeout
            else -> RepositoryError.ScanFailed
        }
    }

    private suspend fun <T> executeNetworkCall(
        cachedWifiResults: List<WifiResult> = emptyList(),
        call: suspend ApiService.() -> Response<ApiEnvelope<T>>,
    ): RepositoryResult<T> {
        return try {
            val response = call(apiService)
            if (response.isSuccessful) {
                val envelope = response.body()
                val data = envelope?.data
                when {
                    envelope == null -> RepositoryResult.Error(RepositoryError.InvalidResponse, cachedWifiResults)
                    envelope.success && data != null -> RepositoryResult.Success(data, DataSource.REMOTE)
                    else -> RepositoryResult.Error(
                        error = RepositoryError.ApiFailure(response.code(), envelope.message ?: "Failed"),
                        cachedWifiResults = cachedWifiResults,
                    )
                }
            } else {
                RepositoryResult.Error(
                    error = RepositoryError.ApiFailure(response.code(), response.message()),
                    cachedWifiResults = cachedWifiResults,
                )
            }
        } catch (t: Throwable) {
            when (t) {
                is CancellationException -> throw t
                is SocketTimeoutException -> RepositoryResult.Error(RepositoryError.Timeout, cachedWifiResults, t)
                is IOException -> RepositoryResult.Error(RepositoryError.InternetLost, cachedWifiResults, t)
                else -> RepositoryResult.Error(RepositoryError.Unknown(t.message ?: "Unknown error", t), cachedWifiResults, t)
            }
        }
    }

    private fun ResponseBody?.safeBodyString(): String? = runCatching { this?.string() }.getOrNull()
}
