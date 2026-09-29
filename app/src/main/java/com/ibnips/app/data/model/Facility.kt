package com.ibnips.app.data.model

data class Facility(
    val id: String,
    val blockId: String,
    val floorId: String,
    val name: String,
    val type: FacilityType,
    val x: Float = 0f,
    val y: Float = 0f,
    val nodeId: String? = null,
    val isMapped: Boolean = false
)
