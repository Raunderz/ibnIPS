package com.ibnips.app.data.model

data class Route(
    val nodeIds: List<String>,
    val totalDistance: Float,
    val estimatedTimeMinutes: Int,
    val usesStairs: Boolean,
    val usesLift: Boolean,
    val crossesFloor: Boolean,
    val isAccessible: Boolean
)
