package com.ibnips.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibnips.app.data.model.*
import com.ibnips.app.data.network.CampusNetworkAdapter
import com.ibnips.app.data.network.PingFingerprint
import com.ibnips.app.data.network.PositionOutcome
import com.ibnips.app.data.network.PositionResultDto
import com.ibnips.app.data.wifi.AndroidWifiScanner
import com.ibnips.app.data.wifi.WifiPositioningEngine
import com.ibnips.app.data.wifi.WifiScanState
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class IndoorPositioningViewModel(
    private val campusViewModel: CampusViewModel,
    private val wifiScanner: AndroidWifiScanner,
    private val networkAdapter: CampusNetworkAdapter? = null,
    private val authToken: () -> String? = { null },
    private val onUnauthorized: (String) -> Unit = {}
) : ViewModel() {

    private val positioningEngine = WifiPositioningEngine(confidenceThreshold = 0.60f)

    // Below this the server calls its own answer "Uncertain" and expects the
    // caller to treat it as no answer. See position.gleam.
    private val usableConfidencePercent = 30

    private val _positioningState = MutableStateFlow(PositioningState.IDLE)
    val positioningState: StateFlow<PositioningState> = _positioningState.asStateFlow()

    private val _currentLocation = MutableStateFlow<IndoorLocation?>(null)
    val currentLocation: StateFlow<IndoorLocation?> = _currentLocation.asStateFlow()

    private val _matchedAPs = MutableStateFlow(0)
    val matchedAPs: StateFlow<Int> = _matchedAPs.asStateFlow()

    private val _detectedAPs = MutableStateFlow(0)
    val detectedAPs: StateFlow<Int> = _detectedAPs.asStateFlow()

    // Why the last attempt ended the way it did, in words rather than an enum.
    private val _detail = MutableStateFlow<String?>(null)
    val detail: StateFlow<String?> = _detail.asStateFlow()

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
        // The server holds the tagged fingerprints, so having none locally does
        // not mean there is nothing to match against — only that the on-device
        // fallback cannot run.
        if (networkAdapter == null && campusViewModel.getAllWifiFingerprints().isEmpty()) {
            _positioningState.value = PositioningState.NO_FINGERPRINTS
            _detail.value = "No Wi-Fi fingerprints on this device."
            return
        }

        _detail.value = null
        _positioningState.value = PositioningState.SCANNING
        wifiScanner.startScan()
    }

    private fun matchFingerprints() {
        val currentScan = wifiScanner.getLatestResults()
        _detectedAPs.value = currentScan.size

        val token = authToken()
        val adapter = networkAdapter
        if (adapter != null && !token.isNullOrBlank() && currentScan.isNotEmpty()) {
            _positioningState.value = PositioningState.MATCHING
            viewModelScope.launch {
                matchOnServer(adapter, token, currentScan)
            }
            return
        }

        matchOnDevice(currentScan)
    }

    private suspend fun matchOnServer(
        adapter: CampusNetworkAdapter,
        token: String,
        scan: List<com.ibnips.app.data.wifi.WifiScanResult>
    ) {
        val fingerprints = scan.map {
            PingFingerprint(bssid = it.bssid, ssid = it.ssid, rssi = it.rssi)
        }

        when (val outcome = adapter.requestPosition(token, fingerprints)) {
            is PositionOutcome.Found -> {
                if (outcome.result.confidence < usableConfidencePercent) {
                    // The server reports its best match even when it is weak, so
                    // a low score is shown rather than hidden, but it is not
                    // treated as a location.
                    _currentLocation.value = toIndoorLocation(outcome.result)
                    _matchedAPs.value = 0
                    _positioningState.value = PositioningState.LOW_CONFIDENCE
                    _detail.value = "Best guess only — the server is not confident."
                } else {
                    _currentLocation.value = toIndoorLocation(outcome.result)
                    _matchedAPs.value = 0
                    _positioningState.value = PositioningState.LOCATED
                    _detail.value = null
                }
            }
            PositionOutcome.NoMatch -> {
                // Nothing tagged shares a network with this scan. There is no
                // local database of server-side fingerprints to fall back to.
                _currentLocation.value = null
                _matchedAPs.value = 0
                _positioningState.value = PositioningState.NO_FINGERPRINTS
                _detail.value = "No tagged room shares a network with this scan. " +
                    "Tag the room you are in with Admin mode."
            }
            is PositionOutcome.Rejected -> {
                if (outcome.message.contains("auth", ignoreCase = true) ||
                    outcome.message.contains("token", ignoreCase = true) ||
                    outcome.message.contains("session", ignoreCase = true)
                ) {
                    onUnauthorized(outcome.message)
                    return
                }
                _currentLocation.value = null
                _positioningState.value = PositioningState.ERROR
                _detail.value = outcome.message
            }
            PositionOutcome.Unreachable -> {
                _currentLocation.value = null
                _positioningState.value = PositioningState.ERROR
                _detail.value = "Cannot reach the server."
            }
        }
    }

    private fun matchOnDevice(currentScan: List<com.ibnips.app.data.wifi.WifiScanResult>) {
        val fingerprints = campusViewModel.getAllWifiFingerprints()
        if (fingerprints.isEmpty()) {
            _positioningState.value = PositioningState.NO_FINGERPRINTS
            _currentLocation.value = null
            _matchedAPs.value = 0
            _detail.value = "No Wi-Fi fingerprints on this device."
            return
        }

        val matchResult = positioningEngine.findBestMatch(currentScan, fingerprints)

        if (matchResult == null) {
            _positioningState.value = PositioningState.LOW_CONFIDENCE
            _currentLocation.value = null
            _matchedAPs.value = 0
            _detail.value = "No room on this device matches the scan."
            return
        }

        _matchedAPs.value = matchResult.matchedBssidsCount

        if (!matchResult.isConfident) {
            _positioningState.value = PositioningState.LOW_CONFIDENCE
            updateEstimatedLocation(matchResult)
        } else {
            updateEstimatedLocation(matchResult)
            _positioningState.value = PositioningState.LOCATED
            _detail.value = "Matched on this device."
        }
    }

    // The server returns the room's own name and map coordinates, so a client
    // that cannot use coordinates keys off nodeId and looks the room up in the
    // map it already fetched from GET /api/map.
    private fun toIndoorLocation(result: PositionResultDto): IndoorLocation {
        val room = campusViewModel.getAllRooms().find { it.id == result.nodeId }
        val floorId = room?.floorId ?: "block_a_f${result.floor}"

        return IndoorLocation(
            locationId = result.nodeId,
            locationType = MappingLocationType.ROOM,
            blockId = room?.blockId ?: "block_a",
            floorId = floorId,
            displayName = room?.displayName ?: result.name,
            x = result.x.toFloat(),
            y = result.y.toFloat(),
            confidence = result.confidence / 100f,
            matchedAccessPoints = 0,
            confidenceLevel = result.confidenceLevel,
            samples = result.samples,
            fromServer = true
        )
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
            matchedAccessPoints = matchResult.matchedBssidsCount,
            fromServer = false
        )
    }

    fun reset() {
        _positioningState.value = PositioningState.IDLE
        _currentLocation.value = null
        _matchedAPs.value = 0
        _detectedAPs.value = 0
        _detail.value = null
    }
}
