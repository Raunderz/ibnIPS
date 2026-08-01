package com.ibnips.kotlinapp.di

import com.ibnips.kotlinapp.data.repository.DebugRepositoryImpl
import com.ibnips.kotlinapp.data.repository.LocationRepositoryImpl
import com.ibnips.kotlinapp.data.repository.RoomRepositoryImpl
import com.ibnips.kotlinapp.data.repository.SettingsRepositoryImpl
import com.ibnips.kotlinapp.domain.repository.DebugRepository
import com.ibnips.kotlinapp.domain.repository.LocationRepository
import com.ibnips.kotlinapp.domain.repository.RoomRepository
import com.ibnips.kotlinapp.domain.repository.SettingsRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindSettingsRepository(
        settingsRepositoryImpl: SettingsRepositoryImpl
    ): SettingsRepository

    @Binds
    @Singleton
    abstract fun bindLocationRepository(
        locationRepositoryImpl: LocationRepositoryImpl
    ): LocationRepository

    @Binds
    @Singleton
    abstract fun bindDebugRepository(
        debugRepositoryImpl: DebugRepositoryImpl
    ): DebugRepository

    @Binds
    @Singleton
    abstract fun bindRoomRepository(
        roomRepositoryImpl: RoomRepositoryImpl
    ): RoomRepository
}
