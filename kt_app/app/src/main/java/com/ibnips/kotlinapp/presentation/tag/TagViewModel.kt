package com.ibnips.kotlinapp.presentation.tag

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibnips.kotlinapp.api.ApiClient
import com.ibnips.kotlinapp.api.ApiService
import com.ibnips.kotlinapp.api.AuthRequest
import com.ibnips.kotlinapp.api.BackendFingerprint
import com.ibnips.kotlinapp.api.PingRequest
import com.ibnips.kotlinapp.domain.model.Fingerprint
import com.ibnips.kotlinapp.domain.model.Room
import com.ibnips.kotlinapp.domain.model.WifiNetwork
import com.ibnips.kotlinapp.domain.repository.RoomRepository
import com.ibnips.kotlinapp.domain.repository.SettingsRepository
import com.ibnips.kotlinapp.storage.PreferenceManager
import com.ibnips.kotlinapp.wifi.WifiScanner
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

sealed interface TagUiEvent {
    data class OnRoomSelected(val room: Room) : TagUiEvent
    data class OnCustomRoomNameChanged(val name: String) : TagUiEvent
    data class OnStepsChanged(val steps: String) : TagUiEvent
    data class OnDirectionChanged(val direction: String) : TagUiEvent
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

    private val apiService: ApiService by lazy {
        ApiClient.getRetrofit(preferenceManager).create(ApiService::class.java)
    }

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
                _uiState.update { it.copy(selectedRoom = event.room, customRoomName = event.room.name) }
            }
            is TagUiEvent.OnCustomRoomNameChanged -> {
                _uiState.update { it.copy(customRoomName = event.name) }
            }
            is TagUiEvent.OnStepsChanged -> {
                _uiState.update { it.copy(steps = event.steps) }
            }
            is TagUiEvent.OnDirectionChanged -> {
                _uiState.update { it.copy(direction = event.direction) }
            }
            TagUiEvent.OnConfirmTag -> confirmTag()
            TagUiEvent.OnDismissError -> {
                _uiState.update { it.copy(uploadState = UploadState.Idle, errorMessage = null) }
            }
        }
    }

    private fun confirmTag() {
        val state = _uiState.value
        val roomName = state.customRoomName.ifBlank { state.selectedRoom?.name ?: "" }
        val floor = state.selectedRoom?.floor ?: 1

        if (roomName.isBlank()) {
            viewModelScope.launch { _uiEffect.emit(TagUiEffect.ShowToast("Please enter or select a room name")) }
            return
        }

        if (state.errorMessage != null || state.visibleNetworks.isEmpty()) {
            viewModelScope.launch {
                _uiEffect.emit(TagUiEffect.ShowToast("Cannot tag: Move your phone to trigger a fresh scan."))
            }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(uploadState = UploadState.Loading) }

            val signature = state.visibleNetworks.sortedByDescending { it.rssi }.take(12)

            // Save locally
            val fingerprint = Fingerprint(
                roomId = state.selectedRoom?.id ?: roomName.lowercase().replace(" ", "_"),
                roomName = roomName,
                floor = floor,
                x = state.selectedRoom?.x,
                y = state.selectedRoom?.y,
                wifiResults = signature
            )
            preferenceManager.saveFingerprint(fingerprint)

            // Sync with backend /api/ping
            val backendSuccess = withContext(Dispatchers.IO) {
                syncWithBackend(
                    roomName = roomName,
                    floor = floor,
                    stepsStr = state.steps,
                    directionStr = state.direction,
                    wifiNetworks = signature
                )
            }

            _uiState.update { it.copy(uploadState = UploadState.Success) }
            val toastMsg = if (backendSuccess) "Tagged & Synced with Backend!" else "Saved locally (Backend offline)"
            _uiEffect.emit(TagUiEffect.ShowToast(toastMsg))
            _uiEffect.emit(TagUiEffect.NavigateBack)
        }
    }

    private suspend fun syncWithBackend(
        roomName: String,
        floor: Int,
        stepsStr: String,
        directionStr: String,
        wifiNetworks: List<WifiNetwork>
    ): Boolean {
        return try {
            var token = preferenceManager.getAuthToken()
            if (token.isNullOrBlank()) {
                val email = preferenceManager.getUserEmail()
                val authRes = apiService.authenticate(AuthRequest(email))
                if (authRes.isSuccessful && authRes.body()?.token != null) {
                    token = authRes.body()!!.token
                    preferenceManager.saveAuthToken(token!!)
                }
            }

            val previousNodeId = preferenceManager.getLastNodeId()
            val stepsInt = stepsStr.toIntOrNull() ?: if (previousNodeId.isEmpty()) -1 else 10
            val direction = directionStr.ifBlank { if (previousNodeId.isEmpty()) "" else "N" }

            val pingRequest = PingRequest(
                name = roomName,
                floor = floor,
                previousNodeId = previousNodeId,
                steps = stepsInt,
                direction = direction,
                fingerprints = wifiNetworks.map { BackendFingerprint(it.bssid, it.ssid, it.rssi) }
            )

            val pingRes = apiService.ping(if (token != null) "Bearer $token" else null, pingRequest)
            if (pingRes.isSuccessful && pingRes.body()?.nodeId != null) {
                val newNodeId = pingRes.body()!!.nodeId!!
                preferenceManager.saveLastNodeId(newNodeId)
                true
            } else {
                false
            }
        } catch (_: Exception) {
            false
        }
    }
}
