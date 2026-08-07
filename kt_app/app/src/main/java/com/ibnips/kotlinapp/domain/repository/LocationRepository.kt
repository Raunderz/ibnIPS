package com.ibnips.kotlinapp.domain.repository

import com.ibnips.kotlinapp.domain.model.Position
import kotlinx.coroutines.flow.Flow

interface LocationRepository {
    fun getPositionUpdates(): Flow<Position>
    suspend fun forceRefresh()
}
