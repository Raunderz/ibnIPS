package com.ibnips.app.data.model

data class Room(
    val id: String,
    val blockId: String,
    val floorId: String,
    val roomNumber: String,
    val displayName: String,
    val type: RoomType,
    val x: Float = 0f,
    val y: Float = 0f,
    val nodeId: String? = null,
    val isMapped: Boolean = false
)
