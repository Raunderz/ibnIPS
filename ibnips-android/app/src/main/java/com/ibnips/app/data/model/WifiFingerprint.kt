package com.ibnips.app.data.model

import com.ibnips.app.data.wifi.WifiScanResult

data class WifiFingerprint(
    val id: String,
    val locationId: String,
    val locationType: MappingLocationType,
    val blockId: String,
    val floorId: String,
    val samples: List<WifiFingerprintSample>,
    val createdAt: Long = System.currentTimeMillis()
)

data class WifiFingerprintSample(
    val networks: List<WifiScanResult>,
    val timestamp: Long = System.currentTimeMillis()
)
