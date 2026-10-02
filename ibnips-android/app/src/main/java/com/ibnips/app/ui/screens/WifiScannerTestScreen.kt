package com.ibnips.app.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.ibnips.app.data.wifi.WifiScanResult
import com.ibnips.app.data.wifi.WifiScanState
import com.ibnips.app.ui.viewmodel.WifiScannerViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WifiScannerTestScreen(
    viewModel: WifiScannerViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scanState by viewModel.scanState.collectAsState()
    val scanResults by viewModel.scanResults.collectAsState()

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val allGranted = permissions.entries.all { it.value }
        if (allGranted) {
            viewModel.startScan()
        }
    }

    fun checkAndStartScan() {
        val permissions = arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        val missingPermissions = permissions.filter {
            ContextCompat.checkSelfPermission(context, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missingPermissions.isEmpty()) {
            viewModel.startScan()
        } else {
            permissionLauncher.launch(permissions)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Wi-Fi Scanner Test") },
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
            Text(
                text = "Scanner Status: ${scanState.name}",
                style = MaterialTheme.typography.titleMedium,
                color = when (scanState) {
                    WifiScanState.SUCCESS -> MaterialTheme.colorScheme.primary
                    WifiScanState.ERROR, WifiScanState.PERMISSION_DENIED -> MaterialTheme.colorScheme.error
                    WifiScanState.SCANNING -> MaterialTheme.colorScheme.secondary
                    else -> MaterialTheme.colorScheme.onSurface
                }
            )

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = { checkAndStartScan() },
                modifier = Modifier.fillMaxWidth(),
                enabled = scanState != WifiScanState.SCANNING
            ) {
                Icon(Icons.Default.Refresh, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Start Wi-Fi Scan")
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "Scan Results (${scanResults.size})",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )

            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

            if (scanResults.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        text = if (scanState == WifiScanState.NO_RESULTS) "No Wi-Fi networks detected." else "No results yet.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.outline
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(bottom = 16.dp)
                ) {
                    items(scanResults) { result ->
                        WifiResultItem(result)
                    }
                }
            }
        }
    }
}

@Composable
fun WifiResultItem(result: WifiScanResult) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = result.ssid.ifEmpty { "Hidden SSID" },
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = result.bssid,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.outline
            )
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "${result.rssi} dBm",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = "${result.frequency} MHz",
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
    }
}
