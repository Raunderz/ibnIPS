package com.ibnips.kotlinapp.domain.model

data class Room(
    val id: String,
    val name: String,
    val floor: Int,
    val x: Float? = null, // Normalized 0.0 to 1.0 for map marker
    val y: Float? = null, // Normalized 0.0 to 1.0 for map marker
    val description: String? = null,
    val occupancy: Int? = null, // Current number of people
    val capacity: Int? = null
)
