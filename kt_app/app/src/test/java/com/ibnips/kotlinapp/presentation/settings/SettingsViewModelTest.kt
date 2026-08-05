package com.ibnips.kotlinapp.presentation.settings

import app.cash.turbine.test
import com.ibnips.kotlinapp.domain.model.MockScenario
import com.ibnips.kotlinapp.domain.repository.DebugRepository
import com.ibnips.kotlinapp.domain.repository.SettingsRepository
import com.ibnips.kotlinapp.util.MainDispatcherRule
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test

class SettingsViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private lateinit var viewModel: SettingsViewModel
    private val settingsRepository = mockk<SettingsRepository>(relaxed = true)
    private val debugRepository = mockk<DebugRepository>(relaxed = true)

    @Before
    fun setup() {
        every { settingsRepository.mockModeEnabled } returns flowOf(false)
        viewModel = SettingsViewModel(settingsRepository, debugRepository)
    }

    @Test
    fun `initial state is correct`() = runTest {
        viewModel.uiState.test {
            val state = awaitItem()
            assertFalse(state.mockModeEnabled)
            assertFalse(state.isResetDialogVisible)
            assertEquals("0.1.0", state.appVersion)
        }
    }

    @Test
    fun `OnMockModeChanged event updates repository`() = runTest {
        viewModel.onEvent(SettingsUiEvent.OnMockModeChanged(true))
        coVerify { settingsRepository.setMockModeEnabled(true) }
    }

    @Test
    fun `OnInjectScenario event injects correct scenario and shows toast`() = runTest {
        viewModel.uiEffect.test {
            viewModel.onEvent(SettingsUiEvent.OnInjectScenario("Lab 201"))
            
            verify { debugRepository.injectMockScenario(MockScenario.LAB_201) }
            
            val effect = awaitItem()
            assertTrue(effect is SettingsUiEffect.ShowToast)
            assertEquals("Injected: Lab 201", (effect as SettingsUiEffect.ShowToast).message)
        }
    }

    @Test
    fun `OnResetDataClicked shows reset dialog`() = runTest {
        viewModel.onEvent(SettingsUiEvent.OnResetDataClicked)
        assertTrue(viewModel.uiState.value.isResetDialogVisible)
    }

    @Test
    fun `OnConfirmReset clears data and hides dialog`() = runTest {
        viewModel.onEvent(SettingsUiEvent.OnResetDataClicked)
        viewModel.onEvent(SettingsUiEvent.OnConfirmReset)
        
        coVerify { settingsRepository.clearAllData() }
        assertFalse(viewModel.uiState.value.isResetDialogVisible)
    }

    @Test
    fun `OnDismissReset hides dialog`() = runTest {
        viewModel.onEvent(SettingsUiEvent.OnResetDataClicked)
        viewModel.onEvent(SettingsUiEvent.OnDismissReset)
        
        assertFalse(viewModel.uiState.value.isResetDialogVisible)
    }
}
