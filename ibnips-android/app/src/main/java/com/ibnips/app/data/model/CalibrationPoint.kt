package com.ibnips.app.data.model

data class CalibrationPoint(
    val id: String,
    val blockId: String,
    val floorId: String,
    val locationType: MappingLocationType,
    val locationId: String,
    val x: Float? = null,
    val y: Float? = null,
    val wifiFingerprintId: String? = null,
    val isCalibrated: Boolean = false,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)
