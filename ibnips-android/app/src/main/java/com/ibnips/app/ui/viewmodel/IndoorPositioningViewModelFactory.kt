package com.ibnips.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.ibnips.app.data.network.CampusNetworkAdapter
import com.ibnips.app.data.wifi.AndroidWifiScanner

class IndoorPositioningViewModelFactory(
    private val campusViewModel: CampusViewModel,
    private val wifiScanner: AndroidWifiScanner,
    private val networkAdapter: CampusNetworkAdapter? = null,
    private val authToken: () -> String? = { null },
    private val onUnauthorized: (String) -> Unit = {}
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(IndoorPositioningViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return IndoorPositioningViewModel(
                campusViewModel,
                wifiScanner,
                networkAdapter,
                authToken,
                onUnauthorized
            ) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
