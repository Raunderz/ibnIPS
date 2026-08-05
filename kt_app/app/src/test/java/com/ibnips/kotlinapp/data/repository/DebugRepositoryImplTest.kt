package com.ibnips.kotlinapp.data.repository

import com.ibnips.kotlinapp.domain.model.MockScenario
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class DebugRepositoryImplTest {

    private lateinit var repository: DebugRepositoryImpl

    @Before
    fun setup() {
        repository = DebugRepositoryImpl()
    }

    @Test
    fun `initial scenario is LAB_201`() {
        assertEquals(MockScenario.LAB_201, repository.getCurrentScenario())
    }

    @Test
    fun `injectMockScenario updates current scenario`() {
        repository.injectMockScenario(MockScenario.HALL_1F)
        assertEquals(MockScenario.HALL_1F, repository.getCurrentScenario())
    }

    @Test
    fun `observeCurrentScenario reflects changes`() = runTest {
        assertEquals(MockScenario.LAB_201, repository.observeCurrentScenario().value)
        repository.injectMockScenario(MockScenario.PHYSICS)
        assertEquals(MockScenario.PHYSICS, repository.observeCurrentScenario().value)
    }
}
