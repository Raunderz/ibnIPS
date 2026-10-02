package com.ibnips.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.ibnips.app.data.network.AuthOutcome
import com.ibnips.app.data.network.AuthStore
import com.ibnips.app.data.network.CampusNetworkAdapter
import com.ibnips.app.data.network.ConnectionStatus
import com.ibnips.app.data.network.ServerConfig
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
    val serverUrl: String = "",
    val checking: Boolean = false,
    val connectionNote: String? = null,
    val message: String? = null
)

class AuthViewModel(
    private val networkAdapter: CampusNetworkAdapter,
    private val authStore: AuthStore,
    private val serverConfig: ServerConfig
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        if (authStore.isLoggedIn) {
            AuthUiState(
                state = AuthState.SIGNED_IN,
                email = authStore.email.orEmpty(),
                userId = authStore.userId.orEmpty(),
                serverUrl = serverConfig.baseUrl
            )
        } else {
            AuthUiState(
                email = authStore.email.orEmpty(),
                serverUrl = serverConfig.baseUrl
            )
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

    fun onServerUrlChanged(value: String) {
        _uiState.update { it.copy(serverUrl = value, connectionNote = null, message = null) }
    }

    // Saves the address and asks the server something that needs no credentials,
    // so a wrong address is reported as a wrong address instead of showing up
    // later as a failed login.
    fun testConnection() {
        val url = _uiState.value.serverUrl
        _uiState.update { it.copy(checking = true, connectionNote = null, message = null) }

        viewModelScope.launch {
            serverConfig.baseUrl = url
            when (val status = networkAdapter.checkConnection(serverConfig.baseUrl)) {
                ConnectionStatus.Reachable -> _uiState.update {
                    it.copy(
                        checking = false,
                        connectionNote = "Reached ${serverConfig.baseUrl}"
                    )
                }
                is ConnectionStatus.Unreachable -> _uiState.update {
                    it.copy(checking = false, connectionNote = status.reason)
                }
            }
        }
    }

    fun signIn(email: String, accessKey: String) {
        val trimmedEmail = email.trim()
        val trimmedKey = accessKey.trim()
        if (trimmedEmail.isEmpty() || trimmedKey.isEmpty()) {
            _uiState.update { it.copy(message = "Enter your email and access key") }
            return
        }

        _uiState.update {
            it.copy(state = AuthState.SIGNING_IN, message = null, connectionNote = null)
        }

        viewModelScope.launch {
            serverConfig.baseUrl = _uiState.value.serverUrl

            when (val outcome = networkAdapter.authenticateUser(trimmedEmail, trimmedKey)) {
                is AuthOutcome.Success -> {
                    authStore.save(outcome.auth, trimmedEmail, trimmedKey)
                    _signedOutReason = null
                    _uiState.value = _uiState.value.copy(
                        state = AuthState.SIGNED_IN,
                        email = trimmedEmail,
                        userId = outcome.auth.userId
                    )
                }
                is AuthOutcome.Rejected -> _uiState.update {
                    it.copy(state = AuthState.SIGNED_OUT, message = outcome.message)
                }
                is AuthOutcome.Unreachable -> _uiState.update {
                    it.copy(
                        state = AuthState.SIGNED_OUT,
                        connectionNote = outcome.reason,
                        message = "Could not reach ${serverConfig.baseUrl}"
                    )
                }
            }
        }
    }

    fun signOut(reason: String? = null) {
        authStore.clear()
        _signedOutReason = reason
        _uiState.value = AuthUiState(
            state = AuthState.SIGNED_OUT,
            serverUrl = serverConfig.baseUrl
        )
    }
}

class AuthViewModelFactory(
    private val networkAdapter: CampusNetworkAdapter,
    private val authStore: AuthStore,
    private val serverConfig: ServerConfig
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(AuthViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return AuthViewModel(networkAdapter, authStore, serverConfig) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
