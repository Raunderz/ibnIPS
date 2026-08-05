package com.ibnips.kotlinapp.data.repository

import com.ibnips.kotlinapp.domain.model.MockScenario
import com.ibnips.kotlinapp.domain.model.Position
import com.ibnips.kotlinapp.domain.repository.DebugRepository
import com.ibnips.kotlinapp.domain.repository.LocationRepository
import com.ibnips.kotlinapp.domain.repository.SettingsRepository
import com.ibnips.kotlinapp.mock.MockDataService
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
class LocationRepositoryImpl @Inject constructor(
    private val settingsRepository: SettingsRepository,
    private val debugRepository: DebugRepository,
    private val wifiScanner: WifiScanner
) : LocationRepository {

    override fun getPositionUpdates(): Flow<Position> {
        return combine(
            settingsRepository.mockModeEnabled,
            settingsRepository.positionUpdateFreq
        ) { isMock, freq ->
            Pair(isMock, freq)
        }.flatMapLatest { (isMock, freq) ->
            flow {
                while (true) {
                    if (isMock) {
                        emit(MockDataService.scenario(debugRepository.getCurrentScenario()))
                    } else {
                        // Perform a real Wi-Fi scan
                        val outcome = wifiScanner.scanNearbyNetworks(forceRefresh = true)
                        
                        when (outcome) {
                            is WifiScanner.WifiScanOutcome.Success -> {
                                val strongestSsid = outcome.results.firstOrNull()?.ssid ?: "Unknown"
                                // In a full implementation, this data would be sent to a positioning engine
                                // For now, we emit a position that confirms real data is being used
                                emit(Position(
                                    floor = 1,
                                    x = 0.5f,
                                    y = 0.5f,
                                    confidence = 100,
                                    roomName = "Near $strongestSsid (Real Time)"
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
