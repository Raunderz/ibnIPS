package com.ibnips.kotlinapp.api

import android.content.Context
import com.ibnips.kotlinapp.mock.MockDataProvider
import com.ibnips.kotlinapp.storage.PreferenceManager
import com.ibnips.kotlinapp.utils.Constants
import com.ibnips.kotlinapp.wifi.WifiResult
import com.ibnips.kotlinapp.wifi.WifiScanner
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.ResponseBody
import retrofit2.Response
import java.io.IOException
import java.net.SocketTimeoutException

/**
 * Repository layer for the native Android implementation.
 *
 * Responsibilities:
 * - orchestrate Wi-Fi scans between live and mock mode
 * - persist scan and location snapshots
 * - upload Wi-Fi and position data to the backend
 * - fetch remote configuration and health status
 * - convert low-level scanner/network failures into typed repository errors
 *
 * This is the central coordination point for the native stack.
 * The React Native bridge and background service should call into this class
 * instead of reaching into the scanner, storage, or API layers directly.
 */
class Repository(
    context: Context,
    private val preferenceManager: PreferenceManager = PreferenceManager(context),
    private val wifiScanner: WifiScanner = WifiScanner(context),
    private val mockDataProvider: MockDataProvider = MockDataProvider(context, preferenceManager),
) {

    private val appContext = context.applicationContext

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
        data object WifiDisabled : RepositoryError("Wi-Fi is disabled or unavailable.")
        data object LocationDisabled : RepositoryError("Location services are disabled.")
        data object InternetLost : RepositoryError("Internet connection is unavailable.")
        data object Timeout : RepositoryError("The operation timed out.")
        data object ScanFailed : RepositoryError("Wi-Fi scanning failed.")
        data object InvalidResponse : RepositoryError("The server returned an invalid response.")

        data class ApiFailure(
            val code: Int,
            override val message: String,
            val body: String? = null,
        ) : RepositoryError(message)

        data class NetworkFailure(
            override val message: String,
            val cause: Throwable? = null,
        ) : RepositoryError(message)

        data class Unknown(
            override val message: String,
            val cause: Throwable? = null,
        ) : RepositoryError(message)
    }

    sealed class RepositoryResult<out T> {
        data class Success<T>(
            val data: T,
            val source: DataSource,
            val isStale: Boolean = false,
        ) : RepositoryResult<T>()

        data class Error(
            val error: RepositoryError,
            val cachedWifiResults: List<WifiResult> = emptyList(),
            val throwable: Throwable? = null,
        ) : RepositoryResult<Nothing>()
    }

    fun isMockModeEnabled(): Boolean {
        return preferenceManager.isMockModeEnabled()
    }

    fun setMockModeEnabled(enabled: Boolean) {
        preferenceManager.setMockModeEnabled(enabled)
    }

    fun getLastWifiScan(): List<WifiResult> {
        return preferenceManager.getLastScan()
    }

    fun getLastLocation(): PreferenceManager.StoredLocation? {
        return preferenceManager.getLastLocation()
    }

    suspend fun getWifiSnapshot(forceRefresh: Boolean = true): RepositoryResult<List<WifiResult>> {
        return withContext(Dispatchers.IO) {
            if (preferenceManager.isMockModeEnabled()) {
                val results = mockDataProvider.generateWifiResults()
                preferenceManager.saveLastScan(results)
                return@withContext RepositoryResult.Success(
                    data = results,
                    source = DataSource.MOCK,
                )
            }

            when (val outcome = wifiScanner.scanNearbyNetworks(forceRefresh = forceRefresh)) {
                is WifiScanner.WifiScanOutcome.Success -> {
                    val results = outcome.results
                    preferenceManager.saveLastScan(results)
                    RepositoryResult.Success(
                        data = results,
                        source = if (outcome.fromCache) DataSource.CACHE else DataSource.LIVE,
                        isStale = outcome.fromCache,
                    )
                }
                is WifiScanner.WifiScanOutcome.Failure -> {
                    val cachedResults = outcome.cachedResults.ifEmpty { preferenceManager.getLastScan() }
                    if (cachedResults.isNotEmpty()) {
                        RepositoryResult.Success(
                            data = cachedResults,
                            source = DataSource.CACHE,
                            isStale = true,
                        )
                    } else {
                        RepositoryResult.Error(
                            error = mapWifiScanFailure(outcome),
                            cachedWifiResults = cachedResults,
                            throwable = outcome.throwable,
                        )
                    }
                }
            }
        }
    }

    suspend fun uploadWifiSnapshot(
        sessionId: String,
        deviceId: String,
        forceRefresh: Boolean = true,
    ): RepositoryResult<WifiScanAckResponse> {
        return withContext(Dispatchers.IO) {
            when (val scanResult = getWifiSnapshot(forceRefresh)) {
                is RepositoryResult.Success -> {
                    val request = WifiScanRequest(
                        sessionId = sessionId,
                        deviceId = deviceId,
                        mockMode = preferenceManager.isMockModeEnabled(),
                        capturedAt = System.currentTimeMillis(),
                        results = scanResult.data.map { it.toPayload() },
                    )

                    executeNetworkCall(
                        cachedWifiResults = scanResult.data,
                    ) {
                        postWifiScan(request)
                    }
                }
                is RepositoryResult.Error -> scanResult
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

            preferenceManager.saveLastLocation(
                latitude = latitude,
                longitude = longitude,
                accuracy = accuracy,
            )

            val request = PositionUpdateRequest(
                sessionId = sessionId,
                deviceId = deviceId,
                mockMode = preferenceManager.isMockModeEnabled(),
                capturedAt = System.currentTimeMillis(),
                latitude = latitude,
                longitude = longitude,
                accuracy = accuracy,
                wifiResults = wifiSnapshot.map { it.toPayload() },
            )

            executeNetworkCall(
                cachedWifiResults = wifiSnapshot,
            ) {
                postPositionUpdate(request)
            }
        }
    }

    suspend fun refreshRemoteConfig(): RepositoryResult<RemoteConfigResponse> {
        return withContext(Dispatchers.IO) {
            val result = executeNetworkCall<RemoteConfigResponse> {
                getRemoteConfig()
            }

            if (result is RepositoryResult.Success) {
                applyRemoteConfig(result.data)
            }

            result
        }
    }

    suspend fun pingServer(): RepositoryResult<HealthResponse> {
        return withContext(Dispatchers.IO) {
            executeNetworkCall<HealthResponse> {
                getHealth()
            }
        }
    }

    private fun applyRemoteConfig(config: RemoteConfigResponse) {
        config.apiBaseUrl?.takeIf { it.isNotBlank() }?.let(preferenceManager::saveApiBaseUrl)
        config.mockModeEnabled?.let(preferenceManager::setMockModeEnabled)
        config.wifiScanIntervalMs?.takeIf { it > 0 }?.let {
            preferenceManager.putUserSetting("wifiScanIntervalMs", it)
        }
        config.positionUpdateIntervalMs?.takeIf { it > 0 }?.let {
            preferenceManager.putUserSetting("positionUpdateIntervalMs", it)
        }
    }

    private fun mapWifiScanFailure(failure: WifiScanner.WifiScanOutcome.Failure): RepositoryError {
        return when (failure.reason) {
            WifiScanner.WifiScanFailureReason.PERMISSION_DENIED -> RepositoryError.NoPermission
            WifiScanner.WifiScanFailureReason.WIFI_DISABLED -> RepositoryError.WifiDisabled
            WifiScanner.WifiScanFailureReason.LOCATION_DISABLED -> RepositoryError.LocationDisabled
            WifiScanner.WifiScanFailureReason.TIMEOUT -> RepositoryError.Timeout
            WifiScanner.WifiScanFailureReason.START_SCAN_FAILED,
            WifiScanner.WifiScanFailureReason.SCAN_THROTTLED,
            WifiScanner.WifiScanFailureReason.SECURITY_EXCEPTION,
            WifiScanner.WifiScanFailureReason.CANCELLED,
            WifiScanner.WifiScanFailureReason.UNKNOWN,
            WifiScanner.WifiScanFailureReason.WIFI_MANAGER_UNAVAILABLE -> RepositoryError.ScanFailed
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
                    envelope == null -> RepositoryResult.Error(
                        error = RepositoryError.InvalidResponse,
                        cachedWifiResults = cachedWifiResults,
                    )
                    envelope.success && data != null -> RepositoryResult.Success(
                        data = data,
                        source = DataSource.REMOTE,
                    )
                    envelope.success && data == null -> RepositoryResult.Error(
                        error = RepositoryError.InvalidResponse,
                        cachedWifiResults = cachedWifiResults,
                    )
                    else -> RepositoryResult.Error(
                        error = RepositoryError.ApiFailure(
                            code = response.code(),
                            message = envelope.message ?: "API request failed.",
                            body = null,
                        ),
                        cachedWifiResults = cachedWifiResults,
                    )
                }
            } else {
                RepositoryResult.Error(
                    error = RepositoryError.ApiFailure(
                        code = response.code(),
                        message = response.message(),
                        body = response.errorBody().safeBodyString(),
                    ),
                    cachedWifiResults = cachedWifiResults,
                )
            }
        } catch (throwable: Throwable) {
            when (throwable) {
                is CancellationException -> throw throwable
                is SocketTimeoutException -> RepositoryResult.Error(
                    error = RepositoryError.Timeout,
                    cachedWifiResults = cachedWifiResults,
                    throwable = throwable,
                )
                is IOException -> RepositoryResult.Error(
                    error = RepositoryError.InternetLost,
                    cachedWifiResults = cachedWifiResults,
                    throwable = throwable,
                )
                else -> RepositoryResult.Error(
                    error = RepositoryError.Unknown(
                        message = throwable.message ?: "Unexpected repository failure.",
                        cause = throwable,
                    ),
                    cachedWifiResults = cachedWifiResults,
                    throwable = throwable,
                )
            }
        }
    }

    private fun ResponseBody?.safeBodyString(): String? {
        return runCatching { this?.string() }.getOrNull()
    }
}

