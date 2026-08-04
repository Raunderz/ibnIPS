package com.ibnips.kotlinapp.ui.screens.tag

import com.ibnips.kotlinapp.data.model.Room
import com.ibnips.kotlinapp.data.model.WifiNetwork

sealed class UploadState {
    data object Idle : UploadState()
    data object Loading : UploadState()
    data object Success : UploadState()
    data class Error(val message: String) : UploadState()
}

data class TagUiState(
    val availableRooms: List<Room> = emptyList(),
    val selectedRoom: Room? = null,
    val visibleNetworks: List<WifiNetwork> = emptyList(),
    val uploadState: UploadState = UploadState.Idle
)
