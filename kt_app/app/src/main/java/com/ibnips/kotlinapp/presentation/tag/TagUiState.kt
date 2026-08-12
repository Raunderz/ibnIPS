package com.ibnips.kotlinapp.presentation.tag

import com.ibnips.kotlinapp.domain.model.Position
import com.ibnips.kotlinapp.domain.model.Room
import com.ibnips.kotlinapp.domain.model.WifiNetwork

sealed interface UploadState {
    data object Idle : UploadState
    data object Loading : UploadState
    data object Success : UploadState
    data class Error(val message: String) : UploadState
}

data class TagUiState(
    val availableRooms: List<Room> = emptyList(),
    val selectedRoom: Room? = null,
    val customRoomName: String = "",
    val steps: String = "-1",
    val direction: String = "",
    val visibleNetworks: List<WifiNetwork> = emptyList(),
    val currentPosition: Position? = null,
    val uploadState: UploadState = UploadState.Idle,
    val isScanning: Boolean = false,
    val errorMessage: String? = null
)
