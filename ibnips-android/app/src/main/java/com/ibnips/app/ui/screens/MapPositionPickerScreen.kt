package com.ibnips.app.ui.screens

import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import com.ibnips.app.ui.components.CampusMapView
import com.ibnips.app.ui.viewmodel.CampusViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapPositionPickerScreen(
    blockId: String,
    floorId: String,
    viewModel: CampusViewModel,
    initialX: Float?,
    initialY: Float?,
    onPositionSelected: (Float, Float) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    var scale by remember { mutableStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }

    var pickedPosition by remember {
        mutableStateOf(
            if (initialX != null && initialY != null && (initialX != 0f || initialY != 0f)) {
                Offset(initialX, initialY)
            } else {
                null
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text("Pick Map Position")
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                },
                actions = {
                    pickedPosition?.let { position ->
                        IconButton(
                            onClick = {
                                onPositionSelected(
                                    position.x,
                                    position.y
                                )
                            }
                        ) {
                            Icon(
                                imageVector = Icons.Default.Check,
                                contentDescription = "Confirm"
                            )
                        }
                    }
                }
            )
        }
    ) { innerPadding ->

        Box(
            modifier = modifier
                .padding(innerPadding)
                .fillMaxSize()
        ) {

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .pointerInput(scale, offset) {
                        detectTapGestures { tapOffset ->

                            // Convert screen position to map position.
                            val mapX =
                                (tapOffset.x - offset.x) / scale

                            val mapY =
                                (tapOffset.y - offset.y) / scale

                            pickedPosition = Offset(
                                mapX,
                                mapY
                            )
                        }
                    }
            ) {

                CampusMapView(
                    scale = scale,
                    offset = offset,
                    onTransform = { newScale, newOffset ->
                        scale = newScale
                        offset = newOffset
                    },
                    rooms = viewModel.getRooms(blockId, floorId),
                    facilities = viewModel.getFacilities(blockId, floorId),
                    checkpoints = viewModel.getCheckpoints(blockId, floorId)
                )

                pickedPosition?.let { position ->
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = "Selected position",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.graphicsLayer(
                            scaleX = 1f / scale,
                            scaleY = 1f / scale,
                            translationX =
                                offset.x + position.x * scale,
                            translationY =
                                offset.y + position.y * scale
                        )
                    )
                }
            }

            Card(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor =
                        MaterialTheme.colorScheme.surface.copy(
                            alpha = 0.9f
                        )
                )
            ) {
                Text(
                    text = if (pickedPosition == null) "Tap on the map to set location" else "Position selected. Tap again to change or Confirm at top.",
                    modifier = Modifier.padding(16.dp),
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
    }
}
