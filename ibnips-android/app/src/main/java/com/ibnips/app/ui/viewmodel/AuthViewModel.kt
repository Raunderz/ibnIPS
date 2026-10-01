package com.ibnips.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.ibnips.app.data.network.AuthOutcome
import com.ibnips.app.data.network.AuthStore
import com.ibnips.app.data.network.CampusNetworkAdapter
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class AuthState {
    SIGNED_OUT,
    SIGNING_IN,
    SIGNED_IN
}

data class AuthUiState(
    val state: AuthState = AuthState.SIGNED_OUT,
    val email: String = "",
    val userId: String = "",
    val message: String? = null
)

class AuthViewModel(
    private val networkAdapter: CampusNetworkAdapter,
    private val authStore: AuthStore
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        if (authStore.isLoggedIn) {
            AuthUiState(
                state = AuthState.SIGNED_IN,
                email = authStore.email.orEmpty(),
                userId = authStore.userId.orEmpty()
            )
        } else {
            AuthUiState(email = authStore.email.orEmpty())
        }
    )
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    // Set when the session is rejected as expired, so the login screen can say
    // why it is asking for the key again instead of appearing with no warning.
    private var _signedOutReason: String? = null
    val signedOutReason: String? get() = _signedOutReason

    val token: String? get() = authStore.token

    fun onEmailChanged(value: String) {
        _uiState.update { it.copy(email = value, message = null) }
    }

    fun signIn(email: String, accessKey: String) {
        val trimmedEmail = email.trim()
        val trimmedKey = accessKey.trim()
        if (trimmedEmail.isEmpty() || trimmedKey.isEmpty()) {
            _uiState.update { it.copy(message = "Enter your email and access key") }
            return
        }

        _uiState.update { it.copy(state = AuthState.SIGNING_IN, message = null) }
        viewModelScope.launch {
            when (val outcome = networkAdapter.authenticateUser(trimmedEmail, trimmedKey)) {
                is AuthOutcome.Success -> {
                    authStore.save(outcome.auth, trimmedEmail, trimmedKey)
                    _signedOutReason = null
                    _uiState.value = AuthUiState(
                        state = AuthState.SIGNED_IN,
                        email = trimmedEmail,
                        userId = outcome.auth.userId
                    )
                }
                is AuthOutcome.Rejected -> _uiState.update {
                    it.copy(state = AuthState.SIGNED_OUT, message = outcome.message)
                }
                AuthOutcome.Unreachable -> _uiState.update {
                    it.copy(state = AuthState.SIGNED_OUT, message = "Cannot reach the server")
                }
            }
        }
    }

    fun signOut(reason: String? = null) {
        authStore.clear()
        _signedOutReason = reason
        _uiState.value = AuthUiState(state = AuthState.SIGNED_OUT)
    }
}

class AuthViewModelFactory(
    private val networkAdapter: CampusNetworkAdapter,
    private val authStore: AuthStore
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(AuthViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return AuthViewModel(networkAdapter, authStore) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
