package com.ibnips.kotlinapp.data.repository

import com.ibnips.kotlinapp.domain.model.Room
import com.ibnips.kotlinapp.domain.repository.RoomRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RoomRepositoryImpl @Inject constructor() : RoomRepository {
    // Mock room list with coordinates for mapping
    private val mockRooms = listOf(
        Room("1", "Lab 201", 2, 0.3f, 0.4f, "Main computer lab", 15, 30),
        Room("2", "Hall 1F", 1, 0.5f, 0.8f, "Entrance hall", 5, 50),
        Room("3", "Physics 312", 3, 0.7f, 0.2f, "Advanced physics lab", 8, 20),
        Room("4", "Office 102", 1, 0.2f, 0.3f, "Administration office", 2, 5),
        Room("5", "Library", 2, 0.8f, 0.6f, "Second floor library", 42, 100),
        Room("6", "Cafeteria", 1, 0.8f, 0.2f, "Main dining area", 25, 80),
        Room("7", "Conference Room A", 2, 0.1f, 0.7f, "Large meeting room", 0, 15)
    )

    override fun getRooms(): Flow<List<Room>> = flow {
        emit(mockRooms)
    }
}
