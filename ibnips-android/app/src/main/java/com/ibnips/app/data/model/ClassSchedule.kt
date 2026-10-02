package com.ibnips.app.data.model

data class ClassSchedule(
    val id: String,
    val sectionId: String,
    val subject: String,
    val roomId: String,
    val day: String, // e.g., "Monday"
    val startTime: String, // e.g., "09:00 AM"
    val endTime: String
)
