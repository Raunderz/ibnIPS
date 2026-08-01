package com.ibnips.kotlinapp.ui.screens.settings

import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ibnips.kotlinapp.domain.model.MockScenario
import com.ibnips.kotlinapp.ui.theme.Dimens

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onNavigateBack: () -> Unit,
    onViewTutorial: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    var showResetDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings", style = MaterialTheme.typography.titleMedium) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(Dimens.ScreenPaddingH),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Testing Section
            Text(
                text = "TESTING",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold
            )
            
            ElevatedCard(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(Dimens.CornerRadiusStandard)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Mock Mode", style = MaterialTheme.typography.titleMedium)
                            Text(
                                "Use simulated data for testing",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Switch(
                            checked = uiState.mockModeEnabled,
                            onCheckedChange = { viewModel.setMockMode(it) }
                        )
                    }

                    if (uiState.mockModeEnabled) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Inject Scenarios",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        
                        // 2x2 Grid of Scenario Injection Buttons
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                ScenarioButton("Inject: Lab 201", Modifier.weight(1f)) {
                                    viewModel.injectScenario(MockScenario.LAB_201)
                                    Toast.makeText(context, "Injected: Lab 201", Toast.LENGTH_SHORT).show()
                                }
                                ScenarioButton("Inject: Hall 1F", Modifier.weight(1f)) {
                                    viewModel.injectScenario(MockScenario.HALL_1F)
                                    Toast.makeText(context, "Injected: Hall 1F", Toast.LENGTH_SHORT).show()
                                }
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                ScenarioButton("Inject: Physics", Modifier.weight(1f)) {
                                    viewModel.injectScenario(MockScenario.PHYSICS)
                                    Toast.makeText(context, "Injected: Physics", Toast.LENGTH_SHORT).show()
                                }
                                ScenarioButton("Inject: Edge Case", Modifier.weight(1f)) {
                                    viewModel.injectScenario(MockScenario.EDGE_CASE)
                                    Toast.makeText(context, "Injected: Edge Case", Toast.LENGTH_SHORT).show()
                                }
                            }
                        }
                    }
                }
            }

            // About Section
            Text(
                text = "ABOUT",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold
            )
            
            OutlinedCard(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(Dimens.CornerRadiusStandard)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Version", style = MaterialTheme.typography.bodyLarge)
                        Text(uiState.appVersion, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Build Date", style = MaterialTheme.typography.bodyLarge)
                        Text(uiState.buildDate, style = MaterialTheme.typography.bodyLarge)
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = onViewTutorial,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(Dimens.CornerRadiusStandard),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.secondaryContainer,
                    contentColor = MaterialTheme.colorScheme.onSecondaryContainer
                )
            ) {
                Text("View Tutorial")
            }

            Button(
                onClick = { showResetDialog = true },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(Dimens.CornerRadiusStandard),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
            ) {
                Text("Reset All Data")
            }
        }
    }

    if (showResetDialog) {
        AlertDialog(
            onDismissRequest = { showResetDialog = false },
            title = { Text("Clear all app data?") },
            text = { Text("This will reset your onboarding status and all settings. The app may need to restart.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.resetAllData()
                        showResetDialog = false
                    }
                ) {
                    Text("Reset", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showResetDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun ScenarioButton(
    name: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(Dimens.CornerRadiusSmall),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Text(
            text = name,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Medium
        )
    }
}
