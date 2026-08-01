package com.ibnips.kotlinapp.presentation.tag

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibnips.kotlinapp.domain.model.Room
import com.ibnips.kotlinapp.domain.model.WifiNetwork
import com.ibnips.kotlinapp.domain.repository.RoomRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface TagUiEvent {
    data class OnRoomSelected(val room: Room) : TagUiEvent
    data object OnConfirmTag : TagUiEvent
    data object OnDismissError : TagUiEvent
}

sealed interface TagUiEffect {
    data object NavigateBack : TagUiEffect
    data class ShowToast(val message: String) : TagUiEffect
}

@HiltViewModel
class TagViewModel @Inject constructor(
    private val roomRepository: RoomRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(TagUiState())
    val uiState: StateFlow<TagUiState> = _uiState.asStateFlow()

    private val _uiEffect = MutableSharedFlow<TagUiEffect>()
    val uiEffect: SharedFlow<TagUiEffect> = _uiEffect.asSharedFlow()

    init {
        loadRooms()
        simulateWifiScans()
    }

    private fun loadRooms() {
        roomRepository.getRooms()
            .onEach { rooms -> _uiState.update { it.copy(availableRooms = rooms) } }
            .launchIn(viewModelScope)
    }

    private fun simulateWifiScans() {
        viewModelScope.launch {
            while (true) {
                val mockNetworks = listOf(
                    WifiNetwork("Campus_WiFi", "00:11:22:33:44:55", -45),
                    WifiNetwork("ICPS_Node_A", "AA:BB:CC:DD:EE:FF", -52),
                    WifiNetwork("eduroam", "11:22:33:44:55:66", -68)
                )
                _uiState.update { it.copy(visibleNetworks = mockNetworks) }
                delay(3000)
            }
        }
    }

    fun onEvent(event: TagUiEvent) {
        when (event) {
            is TagUiEvent.OnRoomSelected -> {
                _uiState.update { it.copy(selectedRoom = event.room) }
            }
            TagUiEvent.OnConfirmTag -> confirmTag()
            TagUiEvent.OnDismissError -> {
                _uiState.update { it.copy(uploadState = UploadState.Idle) }
            }
        }
    }

    private fun confirmTag() {
        val selectedRoom = _uiState.value.selectedRoom ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(uploadState = UploadState.Loading) }
            delay(2000) // Simulating upload
            _uiState.update { it.copy(uploadState = UploadState.Success) }
            _uiEffect.emit(TagUiEffect.ShowToast("Tagged as ${selectedRoom.name}"))
            _uiEffect.emit(TagUiEffect.NavigateBack)
        }
    }
}
