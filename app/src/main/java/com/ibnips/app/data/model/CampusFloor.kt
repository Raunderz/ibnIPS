package com.ibnips.app.data.model

data class CampusFloor(
    val id: String,
    val blockId: String,
    val floorNumber: Int,
    val displayName: String,
    val mapId: String? = null
)
