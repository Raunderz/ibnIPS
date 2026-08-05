package com.ibnips.kotlinapp.domain.model

data class Position(
    val floor: Int,
    val x: Float, // Normalized 0.0 to 1.0
    val y: Float, // Normalized 0.0 to 1.0
    val confidence: Int,
    val roomName: String? = null,
    val timestamp: Long = System.currentTimeMillis()
)
