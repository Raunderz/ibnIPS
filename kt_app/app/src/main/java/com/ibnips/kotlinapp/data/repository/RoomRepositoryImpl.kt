package com.ibnips.kotlinapp.data.repository

import com.ibnips.kotlinapp.domain.model.Room
import com.ibnips.kotlinapp.domain.repository.RoomRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RoomRepositoryImpl @Inject constructor() : RoomRepository {
    // Mock room list based on the spec
    private val mockRooms = listOf(
        Room("1", "Lab 201", 2, "Main computer lab"),
        Room("2", "Hall 1F", 1, "Entrance hall"),
        Room("3", "Physics 312", 3, "Advanced physics lab"),
        Room("4", "Office 102", 1, "Administration office"),
        Room("5", "Library", 2, "Second floor library")
    )

    override fun getRooms(): Flow<List<Room>> = flow {
        // In a real app, this would fetch from a database or API
        emit(mockRooms)
    }
}
