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
    val timestamp: Long = System.currentTimeMillis(),
    // The server's own tier for its answer ("High"/"Medium"/"Low"/"Uncertain"),
    // null when the match came from the on-device engine instead.
    val confidenceLevel: String? = null,
    // How many tagged readings the server's answer is based on. Null for a
    // local match.
    val samples: Int? = null,
    // True when the server answered, false when the on-device engine did.
    val fromServer: Boolean = false
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
