package com.ibnips.kotlinapp.domain.model

data class Fingerprint(
    val roomId: String,
    val roomName: String,
    val floor: Int,
    val x: Float? = null,
    val y: Float? = null,
    val wifiResults: List<WifiNetwork>,
    val timestamp: Long = System.currentTimeMillis()
)
