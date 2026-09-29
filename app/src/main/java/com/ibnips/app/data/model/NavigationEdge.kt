package com.ibnips.app.data.model

data class NavigationEdge(
    val id: String,
    val fromNodeId: String,
    val toNodeId: String,
    val distance: Float? = null,
    val isBidirectional: Boolean = true,
    val accessible: Boolean = true,
    val allowsStairs: Boolean = true,
    val allowsLift: Boolean = true,
    val blockChange: Boolean = false,
    val floorChange: Boolean = false
)
