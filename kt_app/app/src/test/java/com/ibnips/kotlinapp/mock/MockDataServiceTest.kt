package com.ibnips.kotlinapp.mock

import com.ibnips.kotlinapp.domain.model.MockScenario
import org.junit.Assert.assertEquals
import org.junit.Test

class MockDataServiceTest {

    @Test
    fun `scenario LAB_201 returns correct position`() {
        val position = MockDataService.scenario(MockScenario.LAB_201)
        assertEquals(2, position.floor)
        assertEquals("Lab 201", position.roomName)
        assertEquals(90, position.confidence)
    }

    @Test
    fun `scenario HALL_1F returns correct position`() {
        val position = MockDataService.scenario(MockScenario.HALL_1F)
        assertEquals(1, position.floor)
        assertEquals("Hall 1F", position.roomName)
    }

    @Test
    fun `scenario EDGE_CASE returns null room name and low confidence`() {
        val position = MockDataService.scenario(MockScenario.EDGE_CASE)
        assertEquals(null, position.roomName)
        assertEquals(12, position.confidence)
    }
}
