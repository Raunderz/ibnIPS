package com.ibnips.app.data.model

data class NavigationNode(
    val id: String,
    val blockId: String,
    val floorId: String,
    val type: NavigationNodeType,
    val x: Float,
    val y: Float
)
