package com.ibnips.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider

class NavigationViewModelFactory(private val campusViewModel: CampusViewModel) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(NavigationViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return NavigationViewModel(campusViewModel) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
