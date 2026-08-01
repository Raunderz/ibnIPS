package com.ibnips.kotlinapp.domain.model

data class Room(
    val id: String,
    val name: String,
    val floor: Int,
    val description: String? = null
)
