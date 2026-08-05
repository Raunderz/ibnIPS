package com.ibnips.kotlinapp.ui.screens.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibnips.kotlinapp.data.repository.SettingsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class OnboardingViewModel @Inject constructor(
    private val settingsRepository: SettingsRepository
) : ViewModel() {

    fun completeOnboarding(onFinish: () -> Unit) {
        viewModelScope.launch {
            settingsRepository.setHasSeenOnboarding(true)
            onFinish()
        }
    }
}
