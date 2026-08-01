package com.ibnips.kotlinapp.domain.repository

import com.ibnips.kotlinapp.domain.model.Room
import kotlinx.coroutines.flow.Flow

interface RoomRepository {
    fun getRooms(): Flow<List<Room>>
}
