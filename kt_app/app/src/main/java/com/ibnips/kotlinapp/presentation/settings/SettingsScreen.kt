package com.ibnips.kotlinapp.presentation.settings

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
import com.ibnips.kotlinapp.core.theme.Dimens
import com.ibnips.kotlinapp.presentation.components.ICPSButton

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onNavigateBack: () -> Unit,
    onViewTutorial: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        viewModel.uiEffect.collect { effect ->
            when (effect) {
                SettingsUiEffect.NavigateToOnboarding -> onViewTutorial()
                is SettingsUiEffect.ShowToast -> {
                    Toast.makeText(context, effect.message, Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
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
            Text(
                text = "TESTING",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold
            )
            
            ElevatedCard(modifier = Modifier.fillMaxWidth()) {
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
                            onCheckedChange = { viewModel.onEvent(SettingsUiEvent.OnMockModeChanged(it)) }
                        )
                    }

                    if (uiState.mockModeEnabled) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(text = "Inject Scenario", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(8.dp))
                        
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                ScenarioButton("Lab 201", Modifier.weight(1f)) {
                                    viewModel.onEvent(SettingsUiEvent.OnInjectScenario("Lab 201"))
                                }
                                ScenarioButton("Hall 1F", Modifier.weight(1f)) {
                                    viewModel.onEvent(SettingsUiEvent.OnInjectScenario("Hall 1F"))
                                }
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                ScenarioButton("Physics", Modifier.weight(1f)) {
                                    viewModel.onEvent(SettingsUiEvent.OnInjectScenario("Physics"))
                                }
                                ScenarioButton("Edge Case", Modifier.weight(1f)) {
                                    viewModel.onEvent(SettingsUiEvent.OnInjectScenario("Edge Case"))
                                }
                            }
                        }
                    }
                }
            }

            Text(
                text = "ABOUT",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold
            )
            
            OutlinedCard(modifier = Modifier.fillMaxWidth()) {
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
                onClick = { viewModel.onEvent(SettingsUiEvent.OnViewTutorial) },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondaryContainer, contentColor = MaterialTheme.colorScheme.onSecondaryContainer)
            ) {
                Text("View Tutorial")
            }

            Button(
                onClick = { viewModel.onEvent(SettingsUiEvent.OnResetDataClicked) },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
            ) {
                Text("Reset All Data")
            }
        }
    }

    if (uiState.isResetDialogVisible) {
        AlertDialog(
            onDismissRequest = { viewModel.onEvent(SettingsUiEvent.OnDismissReset) },
            title = { Text("Clear all app data?") },
            text = { Text("This will reset your onboarding status and all settings. The app may need to restart.") },
            confirmButton = {
                TextButton(onClick = { viewModel.onEvent(SettingsUiEvent.OnConfirmReset) }) {
                    Text("Reset", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.onEvent(SettingsUiEvent.OnDismissReset) }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun ScenarioButton(name: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(Dimens.CornerRadiusSmall),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Text(name, style = MaterialTheme.typography.labelSmall)
    }
}
