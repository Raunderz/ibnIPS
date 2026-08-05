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
                        emit(MockDataService.scenario(currentMockScenario))
                    } else {
                        // Perform a real Wi-Fi scan
                        val outcome = wifiScanner.scanNearbyNetworks(forceRefresh = true)
                        
                        when (outcome) {
                            is WifiScanner.WifiScanOutcome.Success -> {
                                val strongest = outcome.results.maxByOrNull { it.rssi }
                                val ssid = strongest?.ssid ?: "Unknown Network"
                                
                                // Logic for real-time position reporting
                                emit(Position(
                                    floor = 1, // Defaulting to floor 1 until we have a map-aware engine
                                    x = 0.5f,
                                    y = 0.5f,
                                    confidence = 95,
                                    roomName = "Near $ssid (Real)"
                                ))
                            }
                            is WifiScanner.WifiScanOutcome.Failure -> {
                                emit(Position(
                                    floor = 0,
                                    x = 0f,
                                    y = 0f,
                                    confidence = 0,
                                    roomName = "Scan Error: ${outcome.reason}"
                                ))
                            }
                        }
                    }
                    delay(freq)
                }
            }
        }
    }
}
