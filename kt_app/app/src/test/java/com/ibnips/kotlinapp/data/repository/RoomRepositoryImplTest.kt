package com.ibnips.kotlinapp.data.repository

import app.cash.turbine.test
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class RoomRepositoryImplTest {

    private lateinit var repository: RoomRepositoryImpl

    @Before
    fun setup() {
        repository = RoomRepositoryImpl()
    }

    @Test
    fun `getRooms returns list of rooms`() = runTest {
        repository.getRooms().test {
            val rooms = awaitItem()
            assertEquals(5, rooms.size)
            assertEquals("Lab 201", rooms[0].name)
            awaitComplete()
        }
    }
}
