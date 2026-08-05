package com.ibnips.kotlinapp.di

import android.content.Context
import com.ibnips.kotlinapp.wifi.WifiScanner
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object ScannerModule {

    @Provides
    @Singleton
    fun provideWifiScanner(@ApplicationContext context: Context): WifiScanner {
        return WifiScanner(context)
    }
}
