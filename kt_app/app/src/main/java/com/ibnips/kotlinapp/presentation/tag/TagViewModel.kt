package com.ibnips.kotlinapp.presentation.tag

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibnips.kotlinapp.domain.model.Room
import com.ibnips.kotlinapp.domain.model.WifiNetwork
import com.ibnips.kotlinapp.domain.repository.RoomRepository
import com.ibnips.kotlinapp.domain.repository.SettingsRepository
import com.ibnips.kotlinapp.wifi.WifiScanner
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
    private val roomRepository: RoomRepository,
    private val settingsRepository: SettingsRepository,
    private val wifiScanner: WifiScanner
) : ViewModel() {

    private val _uiState = MutableStateFlow(TagUiState())
    val uiState: StateFlow<TagUiState> = _uiState.asStateFlow()

    private val _uiEffect = MutableSharedFlow<TagUiEffect>()
    val uiEffect: SharedFlow<TagUiEffect> = _uiEffect.asSharedFlow()

    init {
        loadRooms()
        startWifiScanning()
    }

    private fun loadRooms() {
        roomRepository.getRooms()
            .onEach { rooms -> _uiState.update { it.copy(availableRooms = rooms) } }
            .launchIn(viewModelScope)
    }

    private fun startWifiScanning() {
        viewModelScope.launch {
            combine(
                settingsRepository.mockModeEnabled,
                settingsRepository.positionUpdateFreq
            ) { isMock, freq ->
                Pair(isMock, freq)
            }.collectLatest { (isMock, freq) ->
                while (true) {
                    _uiState.update { it.copy(isScanning = true, errorMessage = null) }
                    
                    if (isMock) {
                        delay(500) // Artificial delay for mock scanning feel
                        val mockNetworks = listOf(
                            WifiNetwork("Campus_WiFi", "00:11:22:33:44:55", -45),
                            WifiNetwork("ICPS_Node_A", "AA:BB:CC:DD:EE:FF", -52),
                            WifiNetwork("eduroam", "11:22:33:44:55:66", -68)
                        )
                        _uiState.update { it.copy(visibleNetworks = mockNetworks, isScanning = false) }
                    } else {
                        val outcome = wifiScanner.scanNearbyNetworks(forceRefresh = true)
                        when (outcome) {
                            is WifiScanner.WifiScanOutcome.Success -> {
                                val networks = outcome.results.map {
                                    WifiNetwork(
                                        ssid = it.ssid,
                                        bssid = it.bssid,
                                        rssi = it.rssi,
                                        timestamp = it.timestamp
                                    )
                                }
                                _uiState.update { 
                                    it.copy(
                                        visibleNetworks = networks, 
                                        isScanning = false,
                                        errorMessage = if (networks.isEmpty()) "No Wi-Fi networks found nearby." else null
                                    ) 
                                }
                            }
                            is WifiScanner.WifiScanOutcome.Failure -> {
                                val networks = outcome.cachedResults.map {
                                    WifiNetwork(
                                        ssid = it.ssid,
                                        bssid = it.bssid,
                                        rssi = it.rssi,
                                        timestamp = it.timestamp
                                    )
                                }
                                _uiState.update { 
                                    it.copy(
                                        visibleNetworks = networks,
                                        isScanning = false,
                                        errorMessage = if (networks.isEmpty()) outcome.message else "Live scan failed: ${outcome.reason}. Showing cached data."
                                    ) 
                                }
                            }
                        }
                    }
                    delay(freq)
                }
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
                _uiState.update { it.copy(uploadState = UploadState.Idle, errorMessage = null) }
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
