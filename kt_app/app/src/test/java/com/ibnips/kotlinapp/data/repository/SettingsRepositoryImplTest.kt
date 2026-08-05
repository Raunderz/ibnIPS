package com.ibnips.kotlinapp.data.repository

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import app.cash.turbine.test
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Unit tests for [SettingsRepositoryImpl], verifying that user settings
 * are correctly stored in DataStore/Preferences and exposed via Kotlin Flows.
 */
@RunWith(RobolectricTestRunner::class)
class SettingsRepositoryImplTest {

    private lateinit var context: Context
    private lateinit var repository: SettingsRepositoryImpl

    @Before
    fun setup() {
        context = ApplicationProvider.getApplicationContext()
        repository = SettingsRepositoryImpl(context)
    }

    /**
     * Verifies that the initial values of settings flows match the expected defaults.
     */
    @Test
    fun `initial values are correct`() = runTest {
        repository.mockModeEnabled.test {
            assertFalse(awaitItem())
        }
        repository.positionUpdateFreq.test {
            // Default frequency defined in implementation
            assertEquals(4000L, awaitItem())
        }
    }

    /**
     * Verifies that updating the mock mode persists the value and emits it through the flow.
     */
    @Test
    fun `setMockModeEnabled updates the flow`() = runTest {
        repository.setMockModeEnabled(true)
        repository.mockModeEnabled.test {
            assertTrue(awaitItem())
        }
    }

    /**
     * Verifies that updating the position update frequency persists the value and emits it.
     */
    @Test
    fun `setPositionUpdateFreq updates the flow`() = runTest {
        repository.setPositionUpdateFreq(1000L)
        repository.positionUpdateFreq.test {
            assertEquals(1000L, awaitItem())
        }
    }

    /**
     * Verifies that clearing all data resets all settings to their default values.
     */
    @Test
    fun `clearAllData resets to defaults`() = runTest {
        repository.setMockModeEnabled(true)
        repository.clearAllData()
        repository.mockModeEnabled.test {
            assertFalse(awaitItem())
        }
    }
}
