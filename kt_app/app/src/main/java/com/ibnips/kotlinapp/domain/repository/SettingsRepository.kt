package com.ibnips.kotlinapp.domain.repository

import kotlinx.coroutines.flow.Flow

interface SettingsRepository {
    val hasSeenOnboarding: Flow<Boolean>
    val mockModeEnabled: Flow<Boolean>
    val positionUpdateFreq: Flow<Long>
    val serverEndpoint: Flow<String>

    suspend fun setHasSeenOnboarding(value: Boolean)
    suspend fun setMockModeEnabled(value: Boolean)
    suspend fun setPositionUpdateFreq(value: Long)
    suspend fun setServerEndpoint(value: String)
    suspend fun clearAllData()
}
