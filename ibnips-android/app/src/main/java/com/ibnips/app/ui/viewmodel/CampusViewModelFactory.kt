package com.ibnips.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.ibnips.app.data.network.CampusNetworkAdapter
import com.ibnips.app.data.repository.CampusRepository

class CampusViewModelFactory(
    private val repository: CampusRepository,
    private val networkAdapter: CampusNetworkAdapter
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(CampusViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return CampusViewModel(repository, networkAdapter) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
