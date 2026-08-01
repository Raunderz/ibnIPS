package com.ibnips.kotlinapp.presentation.home

import com.ibnips.kotlinapp.domain.model.Position

data class HomeUiState(
    val currentFloor: Int = 1,
    val position: Position? = null,
    val nearestRoom: String? = null,
    val confidence: Int? = null,
    val isUpdating: Boolean = false,
    val isMockMode: Boolean = false,
    val errorMessage: String? = null
)
