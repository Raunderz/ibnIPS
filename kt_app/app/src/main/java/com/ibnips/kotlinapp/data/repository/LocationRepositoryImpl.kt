package com.ibnips.kotlinapp.data.repository

import com.ibnips.kotlinapp.domain.model.MockScenario
import com.ibnips.kotlinapp.domain.model.Position
import com.ibnips.kotlinapp.domain.repository.DebugRepository
import com.ibnips.kotlinapp.domain.repository.LocationRepository
import com.ibnips.kotlinapp.domain.repository.SettingsRepository
import com.ibnips.kotlinapp.mock.MockDataService
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
    private val debugRepository: DebugRepository
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
                        emit(MockDataService.scenario(MockScenario.EDGE_CASE))
                    }
                    delay(freq)
                }
            }
        }
    }
}
