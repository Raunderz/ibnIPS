package com.ibnips.kotlinapp.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.ibnips.kotlinapp.domain.repository.SettingsRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

@Singleton
class SettingsRepositoryImpl @Inject constructor(
    @ApplicationContext private val context: Context
) : SettingsRepository {
    private val HAS_SEEN_ONBOARDING = booleanPreferencesKey("has_seen_onboarding")
    private val MOCK_MODE_ENABLED = booleanPreferencesKey("mock_mode_enabled")
    private val POSITION_UPDATE_FREQ = longPreferencesKey("position_update_freq")
    private val SERVER_ENDPOINT = stringPreferencesKey("server_endpoint")

    override val hasSeenOnboarding: Flow<Boolean> = context.dataStore.data.map { it[HAS_SEEN_ONBOARDING] ?: false }
    override val mockModeEnabled: Flow<Boolean> = context.dataStore.data.map { it[MOCK_MODE_ENABLED] ?: false }
    override val positionUpdateFreq: Flow<Long> = context.dataStore.data.map { it[POSITION_UPDATE_FREQ] ?: 4000L }
    override val serverEndpoint: Flow<String> = context.dataStore.data.map { it[SERVER_ENDPOINT] ?: "" }

    override suspend fun setHasSeenOnboarding(value: Boolean) {
        context.dataStore.edit { it[HAS_SEEN_ONBOARDING] = value }
    }

    override suspend fun setMockModeEnabled(value: Boolean) {
        context.dataStore.edit { it[MOCK_MODE_ENABLED] = value }
    }

    override suspend fun setPositionUpdateFreq(value: Long) {
        context.dataStore.edit { it[POSITION_UPDATE_FREQ] = value }
    }

    override suspend fun setServerEndpoint(value: String) {
        context.dataStore.edit { it[SERVER_ENDPOINT] = value }
    }

    override suspend fun clearAllData() {
        context.dataStore.edit { it.clear() }
    }
}
