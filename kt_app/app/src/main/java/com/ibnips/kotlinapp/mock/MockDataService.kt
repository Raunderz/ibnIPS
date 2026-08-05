package com.ibnips.kotlinapp.mock

import com.ibnips.kotlinapp.domain.model.Position
import com.ibnips.kotlinapp.domain.model.MockScenario

object MockDataService {
    fun scenario(s: MockScenario): Position = when (s) {
        MockScenario.LAB_201 -> Position(floor = 2, x = 0.5f, y = 0.5f, confidence = 90, roomName = "Lab 201")
        MockScenario.HALL_1F -> Position(floor = 1, x = 0.2f, y = 0.7f, confidence = 60, roomName = "Hall 1F")
        MockScenario.PHYSICS -> Position(floor = 3, x = 0.4f, y = 0.3f, confidence = 55, roomName = "Physics 312")
        MockScenario.EDGE_CASE -> Position(floor = 1, x = 0f, y = 0f, confidence = 12, roomName = null)
    }
}
