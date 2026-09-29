package com.ibnips.app.data.model

data class IndoorLocation(
    val locationId: String,
    val locationType: MappingLocationType,
    val blockId: String,
    val floorId: String,
    val displayName: String,
    val x: Float,
    val y: Float,
    val confidence: Float,
    val matchedAccessPoints: Int,
    val timestamp: Long = System.currentTimeMillis()
)

enum class PositioningState {
    IDLE,
    SCANNING,
    MATCHING,
    LOCATED,
    LOW_CONFIDENCE,
    NO_FINGERPRINTS,
    NO_WIFI,
    PERMISSION_REQUIRED,
    ERROR
}
