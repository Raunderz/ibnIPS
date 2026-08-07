package com.ibnips.kotlinapp.presentation.tag

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibnips.kotlinapp.domain.model.Fingerprint
import com.ibnips.kotlinapp.domain.model.Room
import com.ibnips.kotlinapp.domain.model.WifiNetwork
import com.ibnips.kotlinapp.domain.repository.RoomRepository
import com.ibnips.kotlinapp.domain.repository.SettingsRepository
import com.ibnips.kotlinapp.storage.PreferenceManager
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
    private val wifiScanner: WifiScanner,
    private val preferenceManager: PreferenceManager
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
                        delay(500)
                        val mockNetworks = listOf(
                            WifiNetwork("Campus_WiFi", "00:11:22:33:44:55", -45),
                            WifiNetwork("ICPS_Node_A", "AA:BB:CC:DD:EE:FF", -52)
                        )
                        _uiState.update { it.copy(visibleNetworks = mockNetworks, isScanning = false) }
                    } else {
                        val outcome = wifiScanner.scanNearbyNetworks(forceRefresh = true)
                        when (outcome) {
                            is WifiScanner.WifiScanOutcome.Success -> {
                                val now = System.currentTimeMillis()
                                val networks = outcome.results.map {
                                    WifiNetwork(it.ssid, it.bssid, it.rssi, it.timestamp)
                                }
                                
                                // Anti-Ghosting: Only allow tagging if data is very recent (< 6s)
                                val scanAge = if (outcome.results.isNotEmpty()) now - outcome.results.first().timestamp else 99999
                                val isFresh = scanAge < 6000

                                _uiState.update { 
                                    it.copy(
                                        visibleNetworks = networks, 
                                        isScanning = false,
                                        errorMessage = if (!isFresh) "Waiting for hardware signal update..." else null
                                    ) 
                                }
                            }
                            is WifiScanner.WifiScanOutcome.Failure -> {
                                _uiState.update { it.copy(isScanning = false, errorMessage = "Scanning throttled by system.") }
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
        val state = _uiState.value
        val selectedRoom = state.selectedRoom ?: return
        
        if (state.errorMessage != null || state.visibleNetworks.isEmpty()) {
            viewModelScope.launch {
                _uiEffect.emit(TagUiEffect.ShowToast("Cannot tag: Move your phone to trigger a fresh scan."))
            }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(uploadState = UploadState.Loading) }
            
            // Only save the top 12 strongest signals to create a unique room signature
            val signature = state.visibleNetworks.sortedByDescending { it.rssi }.take(12)

            val fingerprint = Fingerprint(
                roomId = selectedRoom.id,
                roomName = selectedRoom.name,
                floor = selectedRoom.floor,
                x = selectedRoom.x,
                y = selectedRoom.y,
                wifiResults = signature
            )
            preferenceManager.saveFingerprint(fingerprint)
            
            delay(500)
            _uiState.update { it.copy(uploadState = UploadState.Success) }
            _uiEffect.emit(TagUiEffect.ShowToast("Location Verified and Saved!"))
            _uiEffect.emit(TagUiEffect.NavigateBack)
        }
    }
}
