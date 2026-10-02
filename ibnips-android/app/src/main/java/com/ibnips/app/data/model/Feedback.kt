package com.ibnips.app.data.model

data class Feedback(
    val id: String,
    val rating: Int,
    val category: String,
    val comment: String,
    val timestamp: Long
)
