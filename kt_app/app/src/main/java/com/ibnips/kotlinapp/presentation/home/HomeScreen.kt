package com.ibnips.kotlinapp.presentation.home

import android.widget.Toast
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.ibnips.kotlinapp.core.theme.Dimens
import com.ibnips.kotlinapp.core.theme.PrimaryBlue
import com.ibnips.kotlinapp.domain.model.Room
import com.ibnips.kotlinapp.ui.components.ICPSButton
import com.ibnips.kotlinapp.ui.components.ICPSSearchBar
import com.ibnips.kotlinapp.ui.components.InsightCard
import com.ibnips.kotlinapp.ui.components.LocationBadge
import com.ibnips.kotlinapp.ui.components.OccupancyBar
import com.ibnips.kotlinapp.ui.components.RoomItem

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
    val sheetState = rememberModalBottomSheetState()

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
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text("ibnIPS", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        LocationBadge(isMock = uiState.isMockMode)
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.onEvent(HomeUiEvent.OnRefreshRequested) }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
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
            DashboardHeader(userName = "User")

            ICPSSearchBar(
                query = uiState.searchQuery,
                onQueryChange = { viewModel.onEvent(HomeUiEvent.OnSearchQueryChanged(it)) },
                modifier = Modifier.padding(vertical = 8.dp),
                placeholder = "Where are you going?"
            )

            if (uiState.searchQuery.isNotEmpty()) {
                LazyColumn(
                    modifier = Modifier.fillMaxWidth().weight(1f),
                    contentPadding = PaddingValues(vertical = 8.dp)
                ) {
                    items(uiState.filteredRooms) { room ->
                        RoomItem(
                            name = room.name,
                            isSelected = false,
                            onClick = { viewModel.onEvent(HomeUiEvent.OnRoomClicked(room)) }
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxWidth().weight(1f),
                    verticalArrangement = Arrangement.spacedBy(Dimens.ComponentSpacingV),
                    contentPadding = PaddingValues(bottom = 16.dp)
                ) {
                    item { SystemStatusCard(signalStrength = uiState.signalStrength, lastUpdate = uiState.lastScanTime) }

                    item {
                        CampusInsightsSection(
                            studySpaces = uiState.studySpacesCount,
                            busyAreas = uiState.busyAreasCount,
                            savedTags = uiState.savedTagsCount
                        )
                    }

                    item {
                        CategorySection(
                            categories = uiState.categories,
                            onCategoryClick = { viewModel.onEvent(HomeUiEvent.OnCategoryClicked(it)) }
                        )
                    }

                    if (uiState.recentRooms.isNotEmpty()) {
                        item {
                            RecentLocationsSection(
                                rooms = uiState.recentRooms,
                                onRoomClick = { viewModel.onEvent(HomeUiEvent.OnRoomClicked(it)) }
                            )
                        }
                    }

                    item { FloorSelector(selectedFloor = uiState.currentFloor, onFloorSelected = { viewModel.onEvent(HomeUiEvent.OnFloorSelected(it)) }) }

                    item {
                        FloorPlanView(
                            floor = uiState.currentFloor,
                            position = uiState.position,
                            rooms = uiState.rooms,
                            isUpdating = uiState.isUpdating,
                            onRoomClick = { viewModel.onEvent(HomeUiEvent.OnRoomClicked(it)) }
                        )
                    }

                    item { 
                        NearestRoomSection(
                            roomName = uiState.nearestRoom, 
                            confidence = uiState.confidence,
                            isFromTag = uiState.position?.isFromTag == true
                        ) 
                    }

                    item { 
                        QuickActionsSection(
                            onTagClick = { viewModel.onEvent(HomeUiEvent.OnNavigateToTag) }, 
                            onSettingsClick = { viewModel.onEvent(HomeUiEvent.OnNavigateToSettings) }
                        ) 
                    }
                }
            }
        }

        if (uiState.showRoomSheet && uiState.selectedRoom != null) {
            ModalBottomSheet(
                onDismissRequest = { viewModel.onEvent(HomeUiEvent.OnDismissBottomSheet) },
                sheetState = sheetState,
                containerColor = MaterialTheme.colorScheme.surface,
                dragHandle = { BottomSheetDefaults.DragHandle() }
            ) {
                RoomDetailContent(
                    room = uiState.selectedRoom!!,
                    onNavigateClick = {
                        viewModel.onEvent(HomeUiEvent.OnFloorSelected(uiState.selectedRoom!!.floor))
                        viewModel.onEvent(HomeUiEvent.OnDismissBottomSheet)
                    }
                )
            }
        }
    }
}

@Composable
fun CampusInsightsSection(studySpaces: Int, busyAreas: Int, savedTags: Int) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            InsightCard(
                title = "Study Spaces",
                value = "$studySpaces Avail",
                icon = Icons.Default.List,
                color = PrimaryBlue,
                modifier = Modifier.weight(1f)
            )
            InsightCard(
                title = "Busy Areas",
                value = "$busyAreas Noted",
                icon = Icons.Default.Person,
                color = Color(0xFFF59E0B),
                modifier = Modifier.weight(1f)
            )
        }
        InsightCard(
            title = "Personal Saved Tags",
            value = "$savedTags Verified Locations",
            icon = Icons.Default.Bookmark,
            color = Color(0xFF10B981),
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
fun RoomDetailContent(room: Room, onNavigateClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp)
            .padding(bottom = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(text = room.name, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Text(
            text = "Floor ${room.floor} • ${room.description ?: "No description available"}",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 4.dp)
        )

        if (room.occupancy != null && room.capacity != null) {
            Spacer(modifier = Modifier.height(16.dp))
            OccupancyBar(occupancy = room.occupancy!!, capacity = room.capacity!!)
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        ICPSButton(
            text = "Navigate to Room",
            onClick = onNavigateClick,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
fun DashboardHeader(userName: String) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        Text(text = "Welcome back!", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text(text = "Campus positioning is active.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
fun SystemStatusCard(signalStrength: Int, lastUpdate: String) {
    Surface(
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        shape = RoundedCornerShape(Dimens.CornerRadiusStandard),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(Icons.Default.Wifi, contentDescription = null, tint = if (signalStrength > 1) PrimaryBlue else MaterialTheme.colorScheme.error, modifier = Modifier.size(20.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text("Positioning Engine", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                Text(text = "Signal: ${if (signalStrength > 2) "Excellent" else "Low"} • Updated $lastUpdate", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                repeat(4) { index ->
                    Box(modifier = Modifier.width(3.dp).height((4 + (index * 3)).dp).background(color = if (index < signalStrength) PrimaryBlue else Color.Gray.copy(alpha = 0.3f), shape = RoundedCornerShape(1.dp)))
                }
            }
        }
    }
}

@Composable
fun CategorySection(categories: List<String>, onCategoryClick: (String) -> Unit) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding = PaddingValues(vertical = 4.dp)
    ) {
        items(categories) { category ->
            SuggestionChip(
                onClick = { onCategoryClick(category) },
                label = { Text(category) },
                shape = RoundedCornerShape(Dimens.CornerRadiusStandard)
            )
        }
    }
}

@Composable
fun RecentLocationsSection(rooms: List<Room>, onRoomClick: (Room) -> Unit) {
    Column {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            Icon(Icons.Default.History, contentDescription = null, modifier = Modifier.size(16.dp), tint = PrimaryBlue)
            Text("Recently Visited", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
        }
        Spacer(modifier = Modifier.height(8.dp))
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(rooms) { room ->
                SuggestionChip(onClick = { onRoomClick(room) }, label = { Text(room.name, fontSize = 12.sp) }, shape = RoundedCornerShape(Dimens.CornerRadiusStandard))
            }
        }
    }
}

@Composable
fun FloorPlanView(
    floor: Int,
    position: com.ibnips.kotlinapp.domain.model.Position?,
    rooms: List<Room>,
    isUpdating: Boolean,
    onRoomClick: (Room) -> Unit
) {
    BoxWithConstraints(
        modifier = Modifier
            .fillMaxWidth()
            .height(300.dp)
            .background(MaterialTheme.colorScheme.surfaceVariant),
        contentAlignment = Alignment.Center
    ) {
        val viewWidth = maxWidth
        val viewHeight = maxHeight

        AsyncImage(
            model = "https://via.placeholder.com/800x1200.png?text=Floor+$floor", 
            contentDescription = "Floor plan", 
            modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(Dimens.CornerRadiusStandard)), 
            contentScale = ContentScale.Fit
        )

        // Room Markers
        rooms.filter { it.floor == floor && it.x != null && it.y != null }.forEach { room ->
            RoomMarkerWithLabel(
                room = room, 
                viewWidth = viewWidth, 
                viewHeight = viewHeight,
                onClick = { onRoomClick(room) }
            )
        }

        position?.let { pos -> 
            if (pos.floor == floor) {
                UserPositionPin(
                    x = pos.x, 
                    y = pos.y, 
                    viewWidth = viewWidth,
                    viewHeight = viewHeight,
                    isFromTag = pos.isFromTag,
                    roomName = pos.roomName
                )
            } 
        }
        
        if (position == null || isUpdating) {
            Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.05f)))
            CircularProgressIndicator(color = PrimaryBlue, modifier = Modifier.size(32.dp))
        }
    }
}

@Composable
fun RoomMarkerWithLabel(
    room: Room, 
    viewWidth: androidx.compose.ui.unit.Dp, 
    viewHeight: androidx.compose.ui.unit.Dp,
    onClick: () -> Unit
) {
    val xOffset = viewWidth * (room.x ?: 0.5f)
    val yOffset = viewHeight * (room.y ?: 0.5f)

    Column(
        modifier = Modifier
            .offset(x = xOffset - 30.dp, y = yOffset - 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Surface(
            color = MaterialTheme.colorScheme.surface.copy(alpha = 0.8f),
            shape = RoundedCornerShape(4.dp),
            modifier = Modifier.padding(bottom = 2.dp).shadow(2.dp, RoundedCornerShape(4.dp))
        ) {
            Text(
                text = room.name,
                fontSize = 9.sp,
                color = MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        Box(
            modifier = Modifier
                .size(10.dp)
                .background(Color.White, CircleShape)
                .border(2.dp, PrimaryBlue.copy(alpha = 0.7f), CircleShape)
                .clickable { onClick() }
        )
    }
}

@Composable
fun QuickActionsSection(onTagClick: () -> Unit, onSettingsClick: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        ICPSButton(text = "Tag Location", onClick = onTagClick, modifier = Modifier.weight(1f))
        IconButton(onClick = onSettingsClick, modifier = Modifier.size(Dimens.TouchTargetMin).background(MaterialTheme.colorScheme.secondaryContainer, RoundedCornerShape(Dimens.CornerRadiusStandard))) {
            Icon(Icons.Default.Settings, contentDescription = "Settings", tint = MaterialTheme.colorScheme.onSecondaryContainer)
        }
    }
}

@Composable
fun FloorSelector(selectedFloor: Int, onFloorSelected: (Int) -> Unit) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf(1, 2, 3).forEach { floor ->
            val isSelected = selectedFloor == floor
            Button(onClick = { onFloorSelected(floor) }, modifier = Modifier.weight(1f).height(40.dp), colors = ButtonDefaults.buttonColors(containerColor = if (isSelected) PrimaryBlue else MaterialTheme.colorScheme.surfaceVariant, contentColor = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant), shape = RoundedCornerShape(Dimens.CornerRadiusSmall), contentPadding = PaddingValues(0.dp)) {
                Text("L$floor", style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}

@Composable
fun BoxScope.UserPositionPin(
    x: Float, 
    y: Float, 
    viewWidth: androidx.compose.ui.unit.Dp,
    viewHeight: androidx.compose.ui.unit.Dp,
    isFromTag: Boolean, 
    roomName: String?
) {
    val pinColor = if (isFromTag) Color(0xFF10B981) else PrimaryBlue
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val scale by infiniteTransition.animateFloat(initialValue = 1f, targetValue = 2.2f, animationSpec = infiniteRepeatable(tween(1800, easing = LinearOutSlowInEasing), RepeatMode.Restart), label = "scale")
    val alpha by infiniteTransition.animateFloat(initialValue = 0.5f, targetValue = 0f, animationSpec = infiniteRepeatable(tween(1800, easing = LinearOutSlowInEasing), RepeatMode.Restart), label = "alpha")
    
    val animatedX by animateFloatAsState(targetValue = x, animationSpec = spring(dampingRatio = Spring.DampingRatioLowBouncy), label = "x")
    val animatedY by animateFloatAsState(targetValue = y, animationSpec = spring(dampingRatio = Spring.DampingRatioLowBouncy), label = "y")

    val xPos = viewWidth * animatedX
    val yPos = viewHeight * animatedY

    Column(
        modifier = Modifier
            .align(Alignment.TopStart)
            .offset(x = xPos - 50.dp, y = yPos - 70.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        if (isFromTag && roomName != null) {
            Surface(
                color = Color(0xFF064E3B), // Explicit Dark Green Background
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.padding(bottom = 6.dp).shadow(12.dp, RoundedCornerShape(8.dp))
            ) {
                Text(
                    text = roomName,
                    color = Color.White, // Explicit White Text
                    fontSize = 12.sp,
                    fontWeight = FontWeight.ExtraBold,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                )
            }
        }
        
        Box(modifier = Modifier.size(Dimens.PinSize), contentAlignment = Alignment.Center) {
            Box(modifier = Modifier.fillMaxSize().scale(scale).background(pinColor.copy(alpha = alpha), CircleShape))
            Box(modifier = Modifier.size(Dimens.PinSize * 0.8f).shadow(6.dp, CircleShape).background(pinColor, CircleShape).border(2.dp, Color.White, CircleShape))
            if (isFromTag) {
                Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(12.dp))
            }
        }
    }
}

@Composable
fun NearestRoomSection(roomName: String?, confidence: Int?, isFromTag: Boolean) {
    // Deep Green background when verified for maximum contrast
    val containerColor = if (isFromTag) Color(0xFF064E3B) else MaterialTheme.colorScheme.surface
    val iconColor = if (isFromTag) Color(0xFF10B981) else PrimaryBlue
    val textColor = if (isFromTag) Color.White else MaterialTheme.colorScheme.onSurface
    val subTextColor = if (isFromTag) Color.White.copy(alpha = 0.8f) else MaterialTheme.colorScheme.onSurfaceVariant
    
    Card(
        modifier = Modifier.fillMaxWidth(), 
        shape = RoundedCornerShape(Dimens.CornerRadiusStandard), 
        colors = CardDefaults.cardColors(containerColor = containerColor), 
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Surface(color = iconColor.copy(alpha = 0.2f), shape = CircleShape, modifier = Modifier.size(44.dp)) {
                Box(contentAlignment = Alignment.Center) { 
                    Icon(
                        if (isFromTag) Icons.Default.CheckCircle else Icons.Default.Place,
                        contentDescription = null, 
                        tint = if (isFromTag) Color.White else iconColor, 
                        modifier = Modifier.size(24.dp)
                    ) 
                }
            }
            Column {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = roomName ?: "Locating...", 
                        style = MaterialTheme.typography.titleLarge, 
                        fontWeight = FontWeight.ExtraBold,
                        color = textColor
                    )
                    if (isFromTag) {
                        Surface(
                            color = Color.White,
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = "VERIFIED", 
                                style = MaterialTheme.typography.labelSmall, 
                                color = Color(0xFF064E3B),
                                fontWeight = FontWeight.Black,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
                Text(
                    text = "Confidence Level: ${confidence ?: 0}%",
                    style = MaterialTheme.typography.bodyMedium, 
                    color = subTextColor
                )
            }
        }
    }
}
