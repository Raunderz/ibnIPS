package com.ibnips.kotlinapp.ui.screens.tag

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibnips.kotlinapp.data.model.Room
import com.ibnips.kotlinapp.data.model.WifiNetwork
import com.ibnips.kotlinapp.data.repository.RoomRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TagLocationViewModel @Inject constructor(
    private val roomRepository: RoomRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(TagUiState())
    val uiState: StateFlow<TagUiState> = _uiState.asStateFlow()

    init {
        loadRooms()
        startWifiScanSim()
    }

    private fun loadRooms() {
        viewModelScope.launch {
            roomRepository.getRooms().collect { rooms ->
                _uiState.update { it.copy(availableRooms = rooms) }
            }
        }
    }

    private fun startWifiScanSim() {
        viewModelScope.launch {
            while (true) {
                // Simulating Wi-Fi scan results
                val mockNetworks = listOf(
                    WifiNetwork("Campus_WiFi", "00:11:22:33:44:55", -45),
                    WifiNetwork("ICPS_Node_A", "AA:BB:CC:DD:EE:FF", -52),
                    WifiNetwork("eduroam", "11:22:33:44:55:66", -68),
                    WifiNetwork("ICPS_Node_B", "FF:EE:DD:CC:BB:AA", -72),
                    WifiNetwork("Guest_Access", "99:88:77:66:55:44", -80)
                )
                _uiState.update { it.copy(visibleNetworks = mockNetworks) }
                delay(2000)
            }
        }
    }

    fun selectRoom(room: Room) {
        _uiState.update { it.copy(selectedRoom = room) }
    }

    fun confirmTag(onSuccess: () -> Unit) {
        val selectedRoom = _uiState.value.selectedRoom ?: return
        
        viewModelScope.launch {
            _uiState.update { it.copy(uploadState = UploadState.Loading) }
            
            // Simulating network upload delay
            delay(2500)
            
            // For demo purposes, we'll succeed
            _uiState.update { it.copy(uploadState = UploadState.Success) }
            onSuccess()
        }
    }

    fun resetUploadState() {
        _uiState.update { it.copy(uploadState = UploadState.Idle) }
    }
}
