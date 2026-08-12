package com.ibnips.kotlinapp.data.repository

import com.ibnips.kotlinapp.api.ApiClient
import com.ibnips.kotlinapp.api.ApiService
import com.ibnips.kotlinapp.domain.model.Room
import com.ibnips.kotlinapp.domain.repository.RoomRepository
import com.ibnips.kotlinapp.storage.PreferenceManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RoomRepositoryImpl @Inject constructor(
    private val preferenceManager: PreferenceManager
) : RoomRepository {

    private val apiService: ApiService by lazy {
        ApiClient.getRetrofit(preferenceManager).create(ApiService::class.java)
    }

    private val fallbackMockRooms = listOf(
        Room("lab_201_f2", "Lab 201", 2, 0.3f, 0.4f, "Main computer lab", 15, 30),
        Room("hall_1f_f1", "Hall 1F", 1, 0.5f, 0.8f, "Entrance hall", 5, 50),
        Room("physics_312_f3", "Physics 312", 3, 0.7f, 0.2f, "Advanced physics lab", 8, 20),
        Room("office_102_f1", "Office 102", 1, 0.2f, 0.3f, "Administration office", 2, 5),
        Room("library_f2", "Library", 2, 0.8f, 0.6f, "Second floor library", 42, 100),
        Room("cafeteria_f1", "Cafeteria", 1, 0.8f, 0.2f, "Main dining area", 25, 80),
        Room("conference_room_a_f2", "Conference Room A", 2, 0.1f, 0.7f, "Large meeting room", 0, 15)
    )

    override fun getRooms(): Flow<List<Room>> = flow {
        try {
            val response = apiService.getNodes()
            if (response.isSuccessful && response.body() != null) {
                val nodes = response.body()!!
                if (nodes.isNotEmpty()) {
                    val rooms = nodes.map { node ->
                        Room(
                            id = node.nodeId,
                            name = node.name,
                            floor = node.floor,
                            x = if (node.x > 0f) node.x else 0.5f,
                            y = if (node.y > 0f) node.y else 0.5f,
                            description = "Floor ${node.floor} node",
                            occupancy = 0,
                            capacity = 50
                        )
                    }
                    emit(rooms)
                    return@flow
                }
            }
        } catch (_: Exception) {
            // Silently fall back to mock nodes on network error
        }
        emit(fallbackMockRooms)
    }.flowOn(Dispatchers.IO)
}
