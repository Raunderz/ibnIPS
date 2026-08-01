package com.ibnips.kotlinapp.domain.model

data class WifiNetwork(
    val ssid: String,
    val bssid: String,
    val rssi: Int,
    val timestamp: Long = System.currentTimeMillis()
)
