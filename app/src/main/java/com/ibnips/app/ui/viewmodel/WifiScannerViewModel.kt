package com.ibnips.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibnips.app.data.wifi.WifiScanner
import com.ibnips.app.data.wifi.WifiScanResult
import com.ibnips.app.data.wifi.WifiScanState
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn

class WifiScannerViewModel(private val wifiScanner: WifiScanner) : ViewModel() {
    val scanState: StateFlow<WifiScanState> = wifiScanner.scanState
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), WifiScanState.IDLE)

    val scanResults: StateFlow<List<WifiScanResult>> = wifiScanner.scanResults
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun startScan() {
        wifiScanner.startScan()
    }

    fun stopScan() {
        wifiScanner.stopScan()
    }
}
