package com.ibnips.kotlinapp.presentation.home

import com.ibnips.kotlinapp.domain.model.Position
import com.ibnips.kotlinapp.domain.model.Room

data class HomeUiState(
    val currentFloor: Int = 1,
    val position: Position? = null,
    val nearestRoom: String? = null,
    val confidence: Int? = null,
    val signalStrength: Int = 3,
    val lastScanTime: String = "Just now",
    val isUpdating: Boolean = false,
    val isMockMode: Boolean = false,
    val searchQuery: String = "",
    val rooms: List<Room> = emptyList(),
    val filteredRooms: List<Room> = emptyList(),
    val recentRooms: List<Room> = emptyList(),
    val categories: List<String> = listOf("Labs", "Library", "Offices", "Cafeteria"),
    val studySpacesCount: Int = 0,
    val busyAreasCount: Int = 0,
    val savedTagsCount: Int = 0,
    val selectedRoom: Room? = null,
    val showRoomSheet: Boolean = false,
    val errorMessage: String? = null
)
