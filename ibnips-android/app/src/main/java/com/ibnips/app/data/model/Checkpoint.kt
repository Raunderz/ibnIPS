package com.ibnips.app.data.model

data class Checkpoint(
    val id: String,
    val blockId: String,
    val floorId: String,
    val checkpointId: String,
    val displayName: String,
    val x: Float = 0f,
    val y: Float = 0f,
    val isMapped: Boolean = false
)
