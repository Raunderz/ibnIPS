package com.ibnips.kotlinapp.ui.screens.map

import com.ibnips.kotlinapp.domain.model.Position

data class MapUiState(
    val currentFloor: Int = 1,
    val position: Position? = null,
    val nearestRoom: String? = null,
    val confidence: Int? = null,
    val isUpdating: Boolean = false,
    val isMockMode: Boolean = false,
    val errorMessage: String? = null
)
