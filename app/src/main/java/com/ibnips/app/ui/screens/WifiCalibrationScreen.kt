package com.ibnips.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ibnips.app.data.model.MappingLocationType
import com.ibnips.app.data.model.WifiFingerprint
import com.ibnips.app.data.model.WifiFingerprintSample
import com.ibnips.app.data.wifi.WifiScanResult
import com.ibnips.app.data.wifi.WifiScanState
import com.ibnips.app.ui.viewmodel.CampusViewModel
import com.ibnips.app.ui.viewmodel.WifiScannerViewModel
import java.util.UUID

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WifiCalibrationScreen(
    locationId: String,
    locationType: MappingLocationType,
    blockId: String,
    floorId: String,
    displayName: String,
    campusViewModel: CampusViewModel,
    wifiScannerViewModel: WifiScannerViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val scanState by wifiScannerViewModel.scanState.collectAsState()
    val latestResults by wifiScannerViewModel.scanResults.collectAsState()
    
    val samples = remember { mutableStateListOf<WifiFingerprintSample>() }
    val maxSamples = 5
    
    val isCalibrated = campusViewModel.hasWifiFingerprint(locationId)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Wi-Fi Calibration") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = modifier
                .padding(innerPadding)
                .fillMaxSize()
                .padding(16.dp)
        ) {
            // Location Info Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(text = "Location: $displayName", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(text = "Type: ${locationType.name}", style = MaterialTheme.typography.bodySmall)
                    Text(text = "Block: $blockId, Floor: $floorId", style = MaterialTheme.typography.bodySmall)
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            shape = MaterialTheme.shapes.extraSmall,
                            color = if (isCalibrated) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                        ) {
                            Text(
                                text = if (isCalibrated) "CALIBRATED" else "NOT CALIBRATED",
                                style = MaterialTheme.typography.labelSmall,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(text = "Samples: ${samples.size} / $maxSamples", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = { wifiScannerViewModel.startScan() },
                    modifier = Modifier.weight(1f),
                    enabled = scanState != WifiScanState.SCANNING
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Scan Wi-Fi")
                }
                
                Button(
                    onClick = { 
                        if (latestResults.isNotEmpty()) {
                            samples.add(WifiFingerprintSample(networks = latestResults))
                        }
                    },
                    modifier = Modifier.weight(1f),
                    enabled = scanState == WifiScanState.SUCCESS && samples.size < maxSamples,
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)
                ) {
                    Text("Capture Sample")
                }
            }

            if (scanState == WifiScanState.SCANNING) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp))
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Results / Summary
            if (samples.isNotEmpty()) {
                Text(text = "Calibration Summary", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                
                val uniqueBssids = samples.flatMap { s -> s.networks.map { it.bssid } }.distinct()
                val strongestRssi = samples.flatMap { s -> s.networks.map { it.rssi } }.maxOrNull() ?: -100
                
                Text(text = "Unique Access Points: ${uniqueBssids.size}", style = MaterialTheme.typography.bodyMedium)
                Text(text = "Strongest Signal: $strongestRssi dBm", style = MaterialTheme.typography.bodyMedium)
                
                Spacer(modifier = Modifier.height(8.dp))
                
                if (samples.size >= 1) {
                    Button(
                        onClick = {
                            val fingerprint = WifiFingerprint(
                                id = UUID.randomUUID().toString(),
                                locationId = locationId,
                                locationType = locationType,
                                blockId = blockId,
                                floorId = floorId,
                                samples = samples.toList()
                            )
                            campusViewModel.saveWifiFingerprint(fingerprint)
                            onBack()
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Check, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Save Fingerprint")
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Latest Scan Results List
            if (latestResults.isNotEmpty()) {
                Text(text = "Latest Scan Results", style = MaterialTheme.typography.labelLarge)
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                    contentPadding = PaddingValues(vertical = 8.dp)
                ) {
                    items(latestResults) { result ->
                        WifiScanResultSmall(result)
                    }
                }
            } else {
                Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
                    Text(text = "No scan results available", color = MaterialTheme.colorScheme.outline)
                }
            }
        }
    }
}

@Composable
fun WifiScanResultSmall(result: WifiScanResult) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = result.ssid.ifEmpty { "Hidden" }, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold)
            Text(text = result.bssid, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
        }
        Text(text = "${result.rssi} dBm", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
        Spacer(modifier = Modifier.width(8.dp))
        Text(text = "${result.frequency} MHz", style = MaterialTheme.typography.labelSmall)
    }
}
