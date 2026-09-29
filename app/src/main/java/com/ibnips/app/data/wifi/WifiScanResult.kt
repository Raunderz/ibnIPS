package com.ibnips.app.data.wifi

data class WifiScanResult(
    val ssid: String,
    val bssid: String,
    val rssi: Int,
    val frequency: Int,
    val timestamp: Long
)
