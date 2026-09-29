package com.ibnips.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibnips.app.data.model.*
import com.ibnips.app.data.wifi.AndroidWifiScanner
import com.ibnips.app.data.wifi.WifiPositioningEngine
import com.ibnips.app.data.wifi.WifiScanState
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class IndoorPositioningViewModel(
    private val campusViewModel: CampusViewModel,
    private val wifiScanner: AndroidWifiScanner
) : ViewModel() {

    private val positioningEngine = WifiPositioningEngine(confidenceThreshold = 0.60f)

    private val _positioningState = MutableStateFlow(PositioningState.IDLE)
    val positioningState: StateFlow<PositioningState> = _positioningState.asStateFlow()

    private val _currentLocation = MutableStateFlow<IndoorLocation?>(null)
    val currentLocation: StateFlow<IndoorLocation?> = _currentLocation.asStateFlow()

    private val _matchedAPs = MutableStateFlow(0)
    val matchedAPs: StateFlow<Int> = _matchedAPs.asStateFlow()

    private val _detectedAPs = MutableStateFlow(0)
    val detectedAPs: StateFlow<Int> = _detectedAPs.asStateFlow()

    init {
        observeWifiScanner()
    }

    private fun observeWifiScanner() {
        viewModelScope.launch {
            wifiScanner.scanState.collect { state ->
                when (state) {
                    WifiScanState.SUCCESS -> {
                        _positioningState.value = PositioningState.MATCHING
                        matchFingerprints()
                    }
                    WifiScanState.ERROR -> {
                        _positioningState.value = PositioningState.ERROR
                    }
                    WifiScanState.PERMISSION_DENIED -> {
                        _positioningState.value = PositioningState.PERMISSION_REQUIRED
                    }
                    WifiScanState.NO_RESULTS -> {
                        _positioningState.value = PositioningState.NO_WIFI
                    }
                    else -> {}
                }
            }
        }
    }

    fun startPositioning() {
        val fingerprints = campusViewModel.getAllWifiFingerprints()
        if (fingerprints.isEmpty()) {
            _positioningState.value = PositioningState.NO_FINGERPRINTS
            return
        }
        
        _positioningState.value = PositioningState.SCANNING
        wifiScanner.startScan()
    }

    private fun matchFingerprints() {
        val currentScan = wifiScanner.getLatestResults()
        _detectedAPs.value = currentScan.size
        
        val fingerprints = campusViewModel.getAllWifiFingerprints()
        val matchResult = positioningEngine.findBestMatch(currentScan, fingerprints)

        if (matchResult == null) {
            _positioningState.value = PositioningState.LOW_CONFIDENCE
            _currentLocation.value = null
            _matchedAPs.value = 0
            return
        }

        _matchedAPs.value = matchResult.matchedBssidsCount

        if (!matchResult.isConfident) {
            _positioningState.value = PositioningState.LOW_CONFIDENCE
            updateEstimatedLocation(matchResult)
        } else {
            updateEstimatedLocation(matchResult)
            _positioningState.value = PositioningState.LOCATED
        }
    }

    private fun updateEstimatedLocation(matchResult: WifiPositioningEngine.MatchResult) {
        val fp = matchResult.fingerprint
        var displayName = "Unknown"
        var x = 0f
        var y = 0f

        when (fp.locationType) {
            MappingLocationType.ROOM -> {
                val room = campusViewModel.getAllRooms().find { it.id == fp.locationId }
                displayName = room?.displayName ?: room?.roomNumber ?: "Room"
                x = room?.x ?: 0f
                y = room?.y ?: 0f
            }
            MappingLocationType.CORRIDOR_CHECKPOINT -> {
                val checkpoint = campusViewModel.getAllCheckpoints().find { it.id == fp.locationId }
                displayName = checkpoint?.displayName ?: "Checkpoint"
                x = checkpoint?.x ?: 0f
                y = checkpoint?.y ?: 0f
            }
            else -> {
                val facility = campusViewModel.getAllFacilities().find { it.id == fp.locationId }
                displayName = facility?.name ?: "Facility"
                x = facility?.x ?: 0f
                y = facility?.y ?: 0f
            }
        }

        _currentLocation.value = IndoorLocation(
            locationId = fp.locationId,
            locationType = fp.locationType,
            blockId = fp.blockId,
            floorId = fp.floorId,
            displayName = displayName,
            x = x,
            y = y,
            confidence = matchResult.score,
            matchedAccessPoints = matchResult.matchedBssidsCount
        )
    }

    fun reset() {
        _positioningState.value = PositioningState.IDLE
        _currentLocation.value = null
        _matchedAPs.value = 0
        _detectedAPs.value = 0
    }
}
