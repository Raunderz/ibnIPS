package com.ibnips.kotlinapp.presentation.onboarding

import com.ibnips.kotlinapp.domain.repository.SettingsRepository
import com.ibnips.kotlinapp.util.MainDispatcherRule
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Before
import org.junit.Rule
import org.junit.Test

class OnboardingViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private lateinit var viewModel: OnboardingViewModel
    private val settingsRepository = mockk<SettingsRepository>(relaxed = true)

    @Before
    fun setup() {
        viewModel = OnboardingViewModel(settingsRepository)
    }

    @Test
    fun `completeOnboarding updates repository and calls callback`() = runTest {
        var callbackCalled = false
        
        viewModel.completeOnboarding {
            callbackCalled = true
        }
        
        coVerify { settingsRepository.setHasSeenOnboarding(true) }
        assert(callbackCalled)
    }
}
