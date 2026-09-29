package com.ibnips.app.data.wifi

import kotlinx.coroutines.flow.Flow

enum class WifiScanState {
    IDLE,
    REQUESTING_PERMISSION,
    READY,
    SCANNING,
    SUCCESS,
    NO_RESULTS,
    PERMISSION_DENIED,
    ERROR
}

interface WifiScanner {
    val scanState: Flow<WifiScanState>
    val scanResults: Flow<List<WifiScanResult>>
    fun startScan()
    fun stopScan()
    fun getLatestResults(): List<WifiScanResult>
}
