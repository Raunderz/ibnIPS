package com.ibnips.kotlinapp.service

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.ibnips.kotlinapp.api.Repository
import com.ibnips.kotlinapp.mock.MockDataProvider
import com.ibnips.kotlinapp.permissions.PermissionManager
import com.ibnips.kotlinapp.storage.PreferenceManager
import com.ibnips.kotlinapp.utils.Constants
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * Foreground background service that periodically captures Wi-Fi + position data.
 */
class PositionService : Service() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private lateinit var repository: Repository
    private lateinit var preferenceManager: PreferenceManager
    private lateinit var mockDataProvider: MockDataProvider

    private var updateJob: Job? = null
    private var lastNotificationText: String = "Idle"

    override fun onCreate() {
        super.onCreate()
        preferenceManager = PreferenceManager(this)
        mockDataProvider = MockDataProvider(this, preferenceManager)
        repository = Repository(
            context = this,
            preferenceManager = preferenceManager,
            mockDataProvider = mockDataProvider,
        )
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            Constants.Service.ACTION_STOP -> {
                stopServiceLoop()
                stopForegroundService()
                stopSelf()
                return START_NOT_STICKY
            }

            Constants.Service.ACTION_START, null -> {
                startServiceLoop()
                return START_STICKY
            }

            else -> {
                startServiceLoop()
                return START_STICKY
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        stopServiceLoop()
        stopForegroundService()
        serviceScope.cancel()
        super.onDestroy()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
    }

    private fun startServiceLoop() {
        if (updateJob?.isActive == true) return

        startForegroundCompat(buildNotification("Starting position updates"))

        updateJob = serviceScope.launch {
            while (isActive) {
                val startedAt = System.currentTimeMillis()
                val resultText = try {
                    performSingleUpdate()
                } catch (throwable: Throwable) {
                    logError("Position update failed: ${throwable.message}", throwable)
                    "Update failed"
                }

                updateNotification(resultText)

                val intervalMs = readUpdateIntervalMs()
                val elapsed = System.currentTimeMillis() - startedAt
                val delayMs = (intervalMs - elapsed).coerceAtLeast(0L)
                delay(delayMs)
            }
        }
    }

    private fun stopServiceLoop() {
        updateJob?.cancel()
        updateJob = null
    }

    private suspend fun performSingleUpdate(): String {
        return if (preferenceManager.isMockModeEnabled()) {
            performMockUpdate()
        } else {
            performLiveUpdate()
        }
    }

    private suspend fun performMockUpdate(): String {
        val snapshot = mockDataProvider.buildMockSnapshot()
        preferenceManager.saveLastScan(snapshot.wifiResults)
        preferenceManager.saveLastLocation(
            latitude = snapshot.location.latitude,
            longitude = snapshot.location.longitude,
            accuracy = snapshot.location.accuracy,
            timestamp = snapshot.location.timestamp,
        )

        val uploadResult = repository.uploadPositionUpdate(
            sessionId = getOrCreateSessionId(),
            deviceId = getResolvedDeviceId(),
            latitude = snapshot.location.latitude,
            longitude = snapshot.location.longitude,
            accuracy = snapshot.location.accuracy,
            forceRefreshWifi = false,
        )

        return when (uploadResult) {
            is Repository.RepositoryResult.Success -> "Mock update sent"
            is Repository.RepositoryResult.Error -> {
                logRepositoryError(uploadResult.error)
                "Mock data cached"
            }
        }
    }

    private suspend fun performLiveUpdate(): String {
        if (!PermissionManager.hasLocationPermission(this)) {
            logError("Location permission is missing for live position updates.", null)
            return "Missing location permission"
        }

        if (!PermissionManager.isLocationServicesEnabled(this)) {
            logError("Location services are disabled for live position updates.", null)
            return "Location services disabled"
        }

        val location = resolveLiveLocation() ?: preferenceManager.getLastLocation()?.toAndroidLocation()
        if (location == null) {
            logError("No live location available for position update.", null)
            return "No location available"
        }

        val uploadResult = repository.uploadPositionUpdate(
            sessionId = getOrCreateSessionId(),
            deviceId = getResolvedDeviceId(),
            latitude = location.latitude,
            longitude = location.longitude,
            accuracy = location.accuracy.takeIf { it > 0f },
            forceRefreshWifi = true,
        )

        return when (uploadResult) {
            is Repository.RepositoryResult.Success -> "Live update sent"
            is Repository.RepositoryResult.Error -> {
                logRepositoryError(uploadResult.error)
                "Live data cached"
            }
        }
    }

    private fun resolveLiveLocation(): Location? {
        val manager = getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            ?: return null

        val providers = buildList {
            if (manager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                add(LocationManager.GPS_PROVIDER)
            }
            if (manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                add(LocationManager.NETWORK_PROVIDER)
            }
        }

        for (provider in providers) {
            try {
                @Suppress("MissingPermission")
                val location = manager.getLastKnownLocation(provider)
                if (location != null) {
                    return location
                }
            } catch (_: SecurityException) {
                return null
            } catch (_: IllegalArgumentException) {
            }
        }

        return null
    }

    private fun readUpdateIntervalMs(): Long {
        val settings = preferenceManager.getUserSettings()
        val rawInterval = settings.optLong(
            "positionUpdateIntervalMs",
            Constants.Service.POSITION_UPDATE_INTERVAL_MS,
        )

        return rawInterval.coerceIn(
            Constants.Wifi.MIN_SCAN_INTERVAL_MS,
            Constants.Wifi.MAX_SCAN_INTERVAL_MS,
        )
    }

    private fun getOrCreateSessionId(): String {
        val existing = preferenceManager.getString(KEY_SESSION_ID, null)
        if (!existing.isNullOrBlank()) {
            return existing
        }

        val generated = "session-${System.currentTimeMillis()}"
        preferenceManager.saveString(KEY_SESSION_ID, generated)
        return generated
    }

    private fun getResolvedDeviceId(): String {
        val existing = preferenceManager.getString(KEY_DEVICE_ID, null)
        if (!existing.isNullOrBlank()) {
            return existing
        }

        val androidId = runCatching {
            Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID)
        }.getOrNull().orEmpty()

        val resolved = when {
            androidId.isNotBlank() -> androidId
            else -> "device-${UUID.randomUUID()}"
        }

        preferenceManager.saveString(KEY_DEVICE_ID, resolved)
        return resolved
    }

    private fun startForegroundCompat(notification: Notification) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                Constants.Service.FOREGROUND_NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION or ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
            )
        } else {
            @Suppress("DEPRECATION")
            startForeground(Constants.Service.FOREGROUND_NOTIFICATION_ID, notification)
        }
    }

    private fun stopForegroundService() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(Service.STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        try {
            NotificationManagerCompat.from(this).cancel(Constants.Service.FOREGROUND_NOTIFICATION_ID)
        } catch (_: Exception) {}
    }

    private fun buildNotification(contentText: String): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = launchIntent?.let {
            PendingIntent.getActivity(
                this,
                0,
                it,
                pendingIntentFlags(),
            )
        }

        return NotificationCompat.Builder(this, Constants.Service.NOTIFICATION_CHANNEL_ID)
            .setContentTitle(Constants.Service.NOTIFICATION_CHANNEL_NAME)
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .apply {
                if (pendingIntent != null) {
                    setContentIntent(pendingIntent)
                }
            }
            .build()
    }

    private fun updateNotification(contentText: String) {
        if (contentText == lastNotificationText) return
        lastNotificationText = contentText

        // Strict Rule: Explicit check for POST_NOTIFICATIONS on API 33+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                Log.w(Constants.Logging.SERVICE, "Permission POST_NOTIFICATIONS not granted; skipping notification update.")
                return
            }
        }

        val notification = buildNotification(contentText)
        try {
            NotificationManagerCompat.from(this).notify(
                Constants.Service.FOREGROUND_NOTIFICATION_ID,
                notification,
            )
        } catch (_: Exception) {}
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val channel = NotificationChannel(
            Constants.Service.NOTIFICATION_CHANNEL_ID,
            Constants.Service.NOTIFICATION_CHANNEL_NAME,
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "Shows active position update tracking."
            setSound(null, null)
            enableLights(false)
            enableVibration(false)
        }

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            ?: return
        manager.createNotificationChannel(channel)
    }

    private fun logError(message: String, throwable: Throwable?) {
        Log.e(Constants.Logging.SERVICE, message, throwable)
    }

    private fun logRepositoryError(error: Repository.RepositoryError) {
        logError("Repository error: ${error.message}", null)
    }

    private fun pendingIntentFlags(): Int {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
    }

    private fun PreferenceManager.StoredLocation.toAndroidLocation(): Location {
        return Location("cached").apply {
            latitude = this@toAndroidLocation.latitude
            longitude = this@toAndroidLocation.longitude
            accuracy = this@toAndroidLocation.accuracy ?: 0f
            time = this@toAndroidLocation.timestamp
        }
    }

    companion object {
        private const val KEY_SESSION_ID = "position_service_session_id"
        private const val KEY_DEVICE_ID = "position_service_device_id"

        fun createStartIntent(context: Context): Intent {
            return Intent(context, PositionService::class.java).apply {
                action = Constants.Service.ACTION_START
            }
        }

        fun createStopIntent(context: Context): Intent {
            return Intent(context, PositionService::class.java).apply {
                action = Constants.Service.ACTION_STOP
            }
        }
    }
}
