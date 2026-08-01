package com.ibnips.kotlinapp.data.repository

import com.ibnips.kotlinapp.domain.model.MockScenario
import com.ibnips.kotlinapp.domain.repository.DebugRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DebugRepositoryImpl @Inject constructor() : DebugRepository {

    private val _currentScenario = MutableStateFlow(MockScenario.LAB_201)
    
    override fun injectMockScenario(scenario: MockScenario) {
        _currentScenario.value = scenario
    }

    override fun getCurrentScenario(): MockScenario = _currentScenario.value
    
    override fun observeCurrentScenario(): StateFlow<MockScenario> = _currentScenario.asStateFlow()
}
