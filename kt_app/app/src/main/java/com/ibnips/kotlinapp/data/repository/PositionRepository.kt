package com.ibnips.kotlinapp.data.repository

import com.ibnips.kotlinapp.domain.model.Position
import com.ibnips.kotlinapp.domain.model.MockScenario
import com.ibnips.kotlinapp.mock.MockDataService
import com.ibnips.kotlinapp.domain.repository.SettingsRepository
import com.ibnips.kotlinapp.wifi.WifiScanner
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@OptIn(ExperimentalCoroutinesApi::class)
@Singleton
class PositionRepository @Inject constructor(
    private val settingsRepository: SettingsRepository,
    private val wifiScanner: WifiScanner
) {
    private var currentMockScenario = MockScenario.LAB_201
    private var lastValidPosition: Position? = null

    fun injectMockScenario(scenario: MockScenario) {
        currentMockScenario = scenario
    }

    fun getPositionUpdates(): Flow<Position> {
        return combine(
            settingsRepository.mockModeEnabled,
            settingsRepository.positionUpdateFreq
        ) { isMock, freq ->
            Pair(isMock, freq)
        }.flatMapLatest { (isMock, freq) ->
            flow {
                while (true) {
                    if (isMock) {
                        val pos = MockDataService.scenario(currentMockScenario)
                        lastValidPosition = pos
                        emit(pos)
                    } else {
                        val outcome = wifiScanner.scanNearbyNetworks(forceRefresh = true)
                        
                        val currentPosition = when (outcome) {
                            is WifiScanner.WifiScanOutcome.Success -> {
                                val strongest = outcome.results.maxByOrNull { it.rssi }
                                val ssid = strongest?.ssid ?: "Unknown Network"
                                val tag = if (outcome.fromCache) "Cached" else "Real"
                                
                                Position(
                                    floor = 1,
                                    x = 0.5f,
                                    y = 0.5f,
                                    confidence = 95,
                                    roomName = "Near $ssid ($tag)"
                                )
                            }
                            is WifiScanner.WifiScanOutcome.Failure -> {
                                // Gracefully handle throttling by using last known position
                                lastValidPosition?.copy(roomName = "${lastValidPosition?.roomName} (Updating)")
                                    ?: Position(
                                        floor = 0,
                                        x = 0f,
                                        y = 0f,
                                        confidence = 0,
                                        roomName = "Locating..."
                                    )
                            }
                        }
                        
                        if (currentPosition.confidence > 0) {
                            lastValidPosition = currentPosition
                        }
                        emit(currentPosition)
                    }
                    delay(freq)
                }
            }
        }
    }
}
