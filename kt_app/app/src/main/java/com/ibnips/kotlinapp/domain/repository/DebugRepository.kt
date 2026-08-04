package com.ibnips.kotlinapp.domain.repository

import com.ibnips.kotlinapp.domain.model.MockScenario
import kotlinx.coroutines.flow.StateFlow

interface DebugRepository {
    fun injectMockScenario(scenario: MockScenario)
    fun getCurrentScenario(): MockScenario
    fun observeCurrentScenario(): StateFlow<MockScenario>
}
