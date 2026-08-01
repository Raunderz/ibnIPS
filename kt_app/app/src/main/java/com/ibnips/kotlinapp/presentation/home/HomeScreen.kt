package com.ibnips.kotlinapp.presentation.home

import android.widget.Toast
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.ibnips.kotlinapp.presentation.components.ICPSButton
import com.ibnips.kotlinapp.core.theme.Dimens
import com.ibnips.kotlinapp.core.theme.PrimaryBlue

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    initialFloor: Int,
    onNavigateToTag: () -> Unit,
    onNavigateToSettings: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    // Handling UI Effects (Navigation, Toasts)
    LaunchedEffect(Unit) {
        viewModel.uiEffect.collect { effect ->
            when (effect) {
                HomeUiEffect.NavigateToSettings -> onNavigateToSettings()
                HomeUiEffect.NavigateToTag -> onNavigateToTag()
                is HomeUiEffect.ShowToast -> {
                    Toast.makeText(context, effect.message, Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("ibnIPS Home", style = MaterialTheme.typography.titleMedium) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = Dimens.ScreenPaddingH),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // 1. Floor Selector
            FloorSelector(
                selectedFloor = uiState.currentFloor,
                onFloorSelected = { viewModel.onEvent(HomeUiEvent.OnFloorSelected(it)) }
            )

            Spacer(modifier = Modifier.height(Dimens.ComponentSpacingV))

            // 2. Floor Plan Canvas
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(Dimens.CornerRadiusStandard))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center
            ) {
                AsyncImage(
                    model = "https://via.placeholder.com/800x1200.png?text=Floor+${uiState.currentFloor}",
                    contentDescription = "Floor plan for Floor ${uiState.currentFloor}",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Fit
                )

                uiState.position?.let { pos ->
                    if (pos.floor == uiState.currentFloor) {
                        UserPositionPin(x = pos.x, y = pos.y)
                    }
                }

                if (uiState.position == null || uiState.isUpdating) {
                    CircularProgressIndicator(color = PrimaryBlue)
                }
            }

            Spacer(modifier = Modifier.height(Dimens.ComponentSpacingV))

            // 3. Nearest Room Label
            NearestRoomSection(
                roomName = uiState.nearestRoom,
                confidence = uiState.confidence
            )

            Spacer(modifier = Modifier.height(Dimens.ComponentSpacingV))

            // 4. Action Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = Dimens.ScreenPaddingH),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ICPSButton(
                    text = "Tag Location",
                    onClick = { viewModel.onEvent(HomeUiEvent.OnNavigateToTag) },
                    modifier = Modifier.weight(1.5f),
                    enabled = !uiState.isUpdating
                )
                IconButton(
                    onClick = { viewModel.onEvent(HomeUiEvent.OnNavigateToSettings) },
                    modifier = Modifier
                        .size(Dimens.TouchTargetMin)
                        .background(MaterialTheme.colorScheme.secondaryContainer, RoundedCornerShape(Dimens.CornerRadiusStandard))
                ) {
                    Icon(Icons.Default.Settings, contentDescription = "Settings", tint = MaterialTheme.colorScheme.onSecondaryContainer)
                }
                IconButton(
                    onClick = { viewModel.onEvent(HomeUiEvent.OnRefreshRequested) },
                    modifier = Modifier
                        .size(Dimens.TouchTargetMin)
                        .background(MaterialTheme.colorScheme.secondaryContainer, RoundedCornerShape(Dimens.CornerRadiusStandard))
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = MaterialTheme.colorScheme.onSecondaryContainer)
                }
            }
        }
    }
}

@Composable
fun FloorSelector(
    selectedFloor: Int,
    onFloorSelected: (Int) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        listOf(1, 2, 3).forEach { floor ->
            val isSelected = selectedFloor == floor
            Button(
                onClick = { onFloorSelected(floor) },
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isSelected) PrimaryBlue else MaterialTheme.colorScheme.surfaceVariant,
                    contentColor = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant
                ),
                shape = RoundedCornerShape(Dimens.CornerRadiusSmall)
            ) {
                Text("Floor $floor")
            }
        }
    }
}

@Composable
fun BoxScope.UserPositionPin(x: Float, y: Float) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 2f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "scale"
    )
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.6f,
        targetValue = 0f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "alpha"
    )

    val animatedX by animateFloatAsState(targetValue = x, animationSpec = tween(500), label = "x")
    val animatedY by animateFloatAsState(targetValue = y, animationSpec = tween(500), label = "y")

    Box(
        modifier = Modifier
            .align(Alignment.TopStart)
            .offset(x = 300.dp * animatedX, y = 500.dp * animatedY)
            .size(Dimens.PinSize),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .scale(scale)
                .background(PrimaryBlue.copy(alpha = alpha), CircleShape)
        )
        Box(
            modifier = Modifier
                .size(Dimens.PinSize * 0.6f)
                .shadow(4.dp, CircleShape)
                .background(PrimaryBlue, CircleShape)
                .border(2.dp, Color.White, CircleShape)
        )
    }
}

@Composable
fun NearestRoomSection(roomName: String?, confidence: Int?) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(Dimens.CornerRadiusStandard),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Nearest Room: ${roomName ?: "Determining..."}",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = "Confidence: ${confidence ?: 0}%",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
