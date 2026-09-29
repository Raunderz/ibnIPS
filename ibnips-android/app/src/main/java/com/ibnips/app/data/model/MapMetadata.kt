package com.ibnips.app.data.model

data class MapMetadata(
    val id: String,
    val blockId: String,
    val floorId: String,
    val mapName: String,
    val imagePath: String? = null,
    val mapWidth: Int,
    val mapHeight: Int,
    val version: Int
)
