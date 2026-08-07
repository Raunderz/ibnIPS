package com.ibnips.kotlinapp.data.repository

import com.ibnips.kotlinapp.domain.model.Fingerprint
import com.ibnips.kotlinapp.domain.model.Position
import com.ibnips.kotlinapp.domain.repository.DebugRepository
import com.ibnips.kotlinapp.domain.repository.LocationRepository
import com.ibnips.kotlinapp.domain.repository.SettingsRepository
import com.ibnips.kotlinapp.mock.MockDataService
import com.ibnips.kotlinapp.storage.PreferenceManager
import com.ibnips.kotlinapp.wifi.WifiResult
import com.ibnips.kotlinapp.wifi.WifiScanner
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.abs
import kotlin.math.min

@OptIn(ExperimentalCoroutinesApi::class)
@Singleton
class LocationRepositoryImpl @Inject constructor(
    private val settingsRepository: SettingsRepository,
    private val debugRepository: DebugRepository,
    private val wifiScanner: WifiScanner,
    private val preferenceManager: PreferenceManager
) : LocationRepository {

    private val refreshTrigger = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    private var lastValidPosition: Position? = null

    override fun getPositionUpdates(): Flow<Position> {
        return combine(
            settingsRepository.mockModeEnabled,
            settingsRepository.positionUpdateFreq,
            refreshTrigger.onStart { emit(Unit) }
        ) { isMock, freq, _ ->
            Pair(isMock, freq)
        }.flatMapLatest { (isMock, freq) ->
            flow {
                while (true) {
                    val position = performScanAndDeterminePosition(isMock)
                    emit(position)
                    delay(freq)
                }
            }
        }
    }

    override suspend fun forceRefresh() {
        // Immediate Purge: Clear internal memory so the next scan is forced to be fresh
        lastValidPosition = null 
        refreshTrigger.emit(Unit)
    }

    private suspend fun performScanAndDeterminePosition(isMock: Boolean): Position {
        if (isMock) {
            val pos = MockDataService.scenario(debugRepository.getCurrentScenario())
            lastValidPosition = pos
            return pos
        }

        val outcome = wifiScanner.scanNearbyNetworks(forceRefresh = true)
        val currentPosition = when (outcome) {
            is WifiScanner.WifiScanOutcome.Success -> {
                // Strict 6s freshness check - hardware data older than this is discarded
                val now = System.currentTimeMillis()
                val freshResults = outcome.results.filter { (now - it.timestamp) < 6000 }
                
                determinePosition(freshResults, if (outcome.fromCache) "Cached" else "Live")
            }
            is WifiScanner.WifiScanOutcome.Failure -> {
                // If throttled, drop verified status unless it was extremely stable
                if (lastValidPosition != null && lastValidPosition!!.confidence > 90) {
                    lastValidPosition!!.copy(roomName = lastValidPosition!!.roomName + " (Refreshing...)")
                } else {
                    determinePosition(emptyList(), "Searching")
                }
            }
        }

        // Stickiness Guard: Only remember the room if the environment is a near-perfect match.
        // If we move away and confidence drops below 70%, we stop "sticking" and clear the cache.
        if (currentPosition.confidence >= 85) {
            lastValidPosition = currentPosition
        } else if (currentPosition.confidence < 70) {
            lastValidPosition = null
        }

        return currentPosition
    }

    private fun determinePosition(results: List<WifiResult>, sourceTag: String): Position {
        if (results.isEmpty()) {
            return Position(0, 0.5f, 0.5f, 0, "No Wi-Fi signals detected")
        }

        val fingerprints = preferenceManager.getFingerprints()
        val matchResult = findBestMatch(results, fingerprints)

        return if (matchResult != null) {
            val (bestMatch, matchConfidence) = matchResult
            Position(
                floor = bestMatch.floor,
                x = bestMatch.x ?: 0.5f,
                y = bestMatch.y ?: 0.5f,
                confidence = matchConfidence,
                roomName = bestMatch.roomName,
                isFromTag = true
            )
        } else {
            val strongest = results.maxByOrNull { it.rssi }
            Position(
                floor = 1,
                x = 0.5f,
                y = 0.5f,
                confidence = 30, 
                roomName = "Near ${strongest?.ssid} ($sourceTag)",
                isFromTag = false
            )
        }
    }

    private fun findBestMatch(currentScan: List<WifiResult>, fingerprints: List<Fingerprint>): Pair<Fingerprint, Int>? {
        if (fingerprints.isEmpty() || currentScan.isEmpty()) return null

        var bestMatch: Fingerprint? = null
        var highestScore = -1.0
        
        // Neighborhood: Top 8 strongest signals currently visible in the air
        val currentStrongest = currentScan.sortedByDescending { it.rssi }.take(8)
        val currentBssids = currentScan.map { it.bssid }.toSet()

        for (fp in fingerprints) {
            var matchCount = 0
            var rssiSimilaritySum = 0.0
            
            // Signature: The primary signals (Top 10) that define the tagged room
            val fpSignature = fp.wifiResults.sortedByDescending { it.rssi }.take(10)
            val anchorBssid = fpSignature.firstOrNull()?.bssid

            // CRITICAL CHECK 1: The room's "Anchor" (strongest AP when tagged) 
            // MUST be among the top visible signals now.
            if (anchorBssid != null && currentStrongest.none { it.bssid == anchorBssid }) continue

            for (fpNet in fpSignature) {
                val currentNet = currentScan.find { it.bssid == fpNet.bssid }
                if (currentNet != null) {
                    val diff = abs(currentNet.rssi - fpNet.rssi)
                    // High sensitivity: AP signals must be within 12dBm to be considered a match
                    if (diff < 12) {
                        matchCount++
                        // Weight the similarity: perfect match (0 diff) = 1.0, 12dB diff = 0.0
                        rssiSimilaritySum += (1.0 - (diff / 12.0))
                    }
                }
            }

            // CRITICAL CHECK 2: Intrusion Detection (Negative Matching)
            // If the current airwaves have a strong signal that was ABSENT in the tag, 
            // we have definitely moved to a different room.
            var intrusionPenalty = 0.0
            for (curr in currentStrongest) {
                if (curr.rssi > -65 && fp.wifiResults.none { it.bssid == curr.bssid }) {
                    intrusionPenalty += 0.4 // Heavy penalty for unexpected strong signals
                }
            }

            // Require at least 3 high-quality matching nodes to even consider a "Verified" match
            if (matchCount >= 3) {
                val coverage = matchCount.toDouble() / fpSignature.size
                val avgSimilarity = rssiSimilaritySum / matchCount
                
                // Final score: coverage + similarity - penalty
                val score = (coverage * 0.6 + avgSimilarity * 0.4) - intrusionPenalty
                
                if (score > highestScore) {
                    highestScore = score
                    bestMatch = fp
                }
            }
        }

        // Strict Threshold (0.7): We only declare a match if the environment is a 70%+ fit
        if (bestMatch != null && highestScore > 0.7) {
            val confidence = min(100, (highestScore * 100).toInt()).coerceAtLeast(85)
            return Pair(bestMatch, confidence)
        }

        return null
    }
}
