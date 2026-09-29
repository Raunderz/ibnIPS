package com.ibnips.app.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibnips.app.ui.components.*
import com.ibnips.app.ui.navigation.Screen
import com.ibnips.app.ui.theme.*
import com.ibnips.app.ui.viewmodel.CampusViewModel
import com.ibnips.app.ui.viewmodel.SearchResult

@Composable
fun HomeScreen(
    viewModel: CampusViewModel,
    onNavigateToScreen: (Screen, String?) -> Unit,
    modifier: Modifier = Modifier
) {
    val blocks by viewModel.blocks
    val searchResults by viewModel.searchResults
    var selectedSectionIdForSchedule by remember { mutableStateOf<String?>(null) }
    var showFeedbackDialog by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(BackgroundTint),
        contentPadding = PaddingValues(bottom = 24.dp)
    ) {
        // Premium Header
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 32.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "ibnIPS",
                            style = MaterialTheme.typography.displaySmall,
                            fontWeight = FontWeight.Black,
                            color = PrimaryBlue
                        )
                        Text(
                            text = "Indoor Campus Navigator",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                            letterSpacing = 0.5.sp
                        )
                    }
                    IconButton(onClick = { showFeedbackDialog = true }) {
                        Icon(Icons.Default.Star, contentDescription = "Feedback", tint = PrimaryBlue)
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Surface(
                    color = SuccessGreen.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, SuccessGreen.copy(alpha = 0.2f))
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = SuccessGreen,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Campus Navigation Ready",
                            style = MaterialTheme.typography.labelLarge,
                            color = SuccessGreen,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        // Search Section
        item {
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Where do you want to go?",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    SearchBar(
                        placeholder = "Search room, section, subject, facility...",
                        onSearch = { query -> viewModel.onSearchQueryChanged(query) }
                    )
                }
            }
        }

        // Search Results
        if (searchResults.isNotEmpty()) {
            item {
                Text(
                    text = "Search Results",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                    color = PrimaryBlue,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp)
                )
            }
            items(searchResults) { result ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceWhite),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        when (result) {
                            is SearchResult.RoomResult -> {
                                val room = result.room
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.LocationOn, contentDescription = null, tint = PrimaryBlue)
                                    Spacer(modifier = Modifier.width(16.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(text = room.displayName, fontWeight = FontWeight.Bold)
                                        Text(text = "Room ${room.roomNumber} • ${room.blockId.uppercase().replace("_", " ")} • Floor ${room.floorId.last()}", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                    }
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                                    TextButton(onClick = { onNavigateToScreen(Screen.Map, room.blockId) }) {
                                        Text("View on Map")
                                    }
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Button(onClick = { onNavigateToScreen(Screen.Navigate, null) }) {
                                        Text("Navigate")
                                    }
                                }
                            }
                            is SearchResult.SectionResult -> {
                                val section = result.section
                                val rooms = viewModel.getRoomsForSection(section)
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Person, contentDescription = null, tint = PrimaryBlue)
                                    Spacer(modifier = Modifier.width(16.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(text = "Section: ${section.name}", fontWeight = FontWeight.Bold)
                                        Text(text = "${rooms.size} assigned rooms", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                    }
                                }
                                if (rooms.isNotEmpty()) {
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(text = "Rooms Grouped by Block/Floor:", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                                    rooms.groupBy { it.blockId to it.floorId }.forEach { (key, roomList) ->
                                        Text(
                                            text = "• ${key.first.uppercase().replace("_", " ")} Floor ${key.second.last()}: " + roomList.joinToString { it.roomNumber },
                                            style = MaterialTheme.typography.bodyMedium,
                                            modifier = Modifier.padding(start = 8.dp, top = 2.dp)
                                        )
                                    }
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                                    OutlinedButton(onClick = { selectedSectionIdForSchedule = section.id }) {
                                        Text("Today's Schedule")
                                    }
                                    if (rooms.isNotEmpty()) {
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Button(onClick = { onNavigateToScreen(Screen.Map, rooms.first().blockId) }) {
                                            Text("View First Room")
                                        }
                                    }
                                }
                            }
                            is SearchResult.SubjectResult -> {
                                val schedule = result.schedule
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Info, contentDescription = null, tint = PrimaryBlue)
                                    Spacer(modifier = Modifier.width(16.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(text = "Subject: ${schedule.subject}", fontWeight = FontWeight.Bold)
                                        Text(text = "Time: ${schedule.startTime} - ${schedule.endTime} (${schedule.day})", style = MaterialTheme.typography.bodyMedium)
                                        Text(text = "Room ID: ${schedule.roomId}", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                    }
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                                    Button(onClick = { onNavigateToScreen(Screen.Navigate, null) }) {
                                        Text("Navigate")
                                    }
                                }
                            }
                            is SearchResult.FacilityResult -> {
                                val facility = result.facility
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Build, contentDescription = null, tint = PrimaryBlue)
                                    Spacer(modifier = Modifier.width(16.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(text = facility.name, fontWeight = FontWeight.Bold)
                                        Text(text = "${facility.blockId.uppercase().replace("_", " ")} • Floor ${facility.floorId.last()}", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                                    }
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                                    Button(onClick = { onNavigateToScreen(Screen.Map, facility.blockId) }) {
                                        Text("View Map")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Quick Actions Grid
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    QuickActionCard(
                        title = "Scan & Locate",
                        subtitle = "Find my position",
                        icon = Icons.Default.Refresh,
                        onClick = { onNavigateToScreen(Screen.IndoorPositioning, null) },
                        modifier = Modifier.weight(1f)
                    )
                    QuickActionCard(
                        title = "Navigate",
                        subtitle = "Route explorer",
                        icon = Icons.Default.PlayArrow,
                        onClick = { onNavigateToScreen(Screen.Navigate, null) },
                        modifier = Modifier.weight(1f)
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    QuickActionCard(
                        title = "Campus Map",
                        subtitle = "Floor viewer",
                        icon = Icons.Default.LocationOn,
                        onClick = { onNavigateToScreen(Screen.Map, null) },
                        modifier = Modifier.weight(1f)
                    )
                    QuickActionCard(
                        title = "Facilities",
                        subtitle = "Lifts, stairs...",
                        icon = Icons.Default.List,
                        onClick = { },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // Buildings Section
        item {
            Text(
                text = "Campus Buildings",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Black,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp)
            )
        }

        items(blocks) { block ->
            BuildingCard(
                name = block.displayName,
                description = block.description,
                onClick = { onNavigateToScreen(Screen.BuildingDetail, block.id) },
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
            )
        }

        // Quick Facilities Row
        item {
            Column(modifier = Modifier.padding(top = 24.dp)) {
                Text(
                    text = "Quick Facilities",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Black,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp)
                )
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    val facilities = listOf(
                        Triple("Washroom", Icons.Default.Info, Color(0xFF9C27B0)),
                        Triple("Lift", Icons.Default.Build, NodeLift),
                        Triple("Stairs", Icons.Default.Menu, NodeStairs),
                        Triple("Entrance", Icons.Default.Home, NodeEntrance),
                        Triple("Exit", Icons.Default.ExitToApp, NodeExit)
                    )
                    items(facilities) { (name, icon, color) ->
                        Surface(
                            onClick = { },
                            shape = RoundedCornerShape(16.dp),
                            color = color.copy(alpha = 0.1f),
                            modifier = Modifier.size(width = 110.dp, height = 100.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(28.dp))
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(name, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = color)
                            }
                        }
                    }
                }
            }
        }

        // Recent Destinations
        item {
            Text(
                text = "Recent Searches",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Black,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 20.dp)
            )
        }

        items(listOf("A204 Admin", "Library Level 1", "Main Cafeteria")) { recent ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 2.dp)
                    .background(SurfaceWhite, shape = RoundedCornerShape(12.dp))
                    .clickable { }
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    modifier = Modifier.size(36.dp),
                    shape = CircleShape,
                    color = BackgroundTint
                ) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.outline,
                        modifier = Modifier.padding(8.dp)
                    )
                }
                Spacer(modifier = Modifier.width(16.dp))
                Text(
                    text = recent,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.weight(1f))
                Icon(Icons.Default.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.outline)
            }
        }
    }

    // Schedule Dialog
    selectedSectionIdForSchedule?.let { sectionId ->
        val section = viewModel.getSection(sectionId)
        val schedules = viewModel.getTodaySchedule(sectionId)
        val nextClass = viewModel.getNextClass(sectionId)
        
        AlertDialog(
            onDismissRequest = { selectedSectionIdForSchedule = null },
            title = { Text(text = "${section?.name ?: "Section"} Timetable") },
            text = {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text(text = "Total Classes Today: ${schedules.size}", fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    if (nextClass != null) {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                            modifier = Modifier.padding(vertical = 4.dp).fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(8.dp)) {
                                Text(text = "NEXT CLASS / CLASSROOM FINDER", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                                Text(text = nextClass.subject, fontWeight = FontWeight.Bold)
                                Text(text = "Time: ${nextClass.startTime} at Room ${nextClass.roomId}")
                            }
                        }
                    }
                    
                    if (schedules.isEmpty()) {
                        Text(
                            text = "No class schedule available for today.",
                            modifier = Modifier.padding(vertical = 16.dp),
                            color = MaterialTheme.colorScheme.outline
                        )
                    } else {
                        LazyColumn(modifier = Modifier.heightIn(max = 200.dp)) {
                            items(schedules) { schedule ->
                                Card(
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                                ) {
                                    Column(modifier = Modifier.padding(8.dp)) {
                                        Text(text = schedule.subject, fontWeight = FontWeight.Bold)
                                        Text(text = "${schedule.startTime} - ${schedule.endTime} | Room: ${schedule.roomId}")
                                        Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                                            TextButton(onClick = { onNavigateToScreen(Screen.Navigate, null); selectedSectionIdForSchedule = null }) {
                                                Text("Navigate")
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { selectedSectionIdForSchedule = null }) {
                    Text("Close")
                }
            }
        )
    }

    // Feedback Dialog
    if (showFeedbackDialog) {
        var rating by remember { mutableIntStateOf(5) }
        var category by remember { mutableStateOf("Wrong room location") }
        var comment by remember { mutableStateOf("") }
        var submitted by remember { mutableStateOf(false) }
        
        val categories = listOf("Wrong room location", "Wrong route", "Wrong floor", "Wi-Fi positioning inaccurate", "Map incorrect", "Room unavailable", "Other")

        AlertDialog(
            onDismissRequest = { showFeedbackDialog = false },
            title = { Text(text = "Submit Campus Feedback / Issue") },
            text = {
                Column(modifier = Modifier.fillMaxWidth()) {
                    if (!submitted) {
                        Text(text = "How was your navigation?")
                        Row {
                            (1..5).forEach { star ->
                                IconButton(onClick = { rating = star }) {
                                    Icon(
                                        imageVector = Icons.Default.Star,
                                        contentDescription = null,
                                        tint = if (star <= rating) Color(0xFFFFB300) else Color.LightGray
                                    )
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(text = "Category:")
                        Box {
                            var expanded by remember { mutableStateOf(false) }
                            TextButton(onClick = { expanded = true }) {
                                Text(text = category)
                            }
                            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                                categories.forEach { cat ->
                                    DropdownMenuItem(
                                        text = { Text(cat) },
                                        onClick = { category = cat; expanded = false }
                                    )
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = comment,
                            onValueChange = { comment = it },
                            label = { Text("Additional comments / Report Issue") },
                            modifier = Modifier.fillMaxWidth()
                        )
                    } else {
                        Text(text = "Thank you for your feedback.", color = SuccessGreen, fontWeight = FontWeight.Bold)
                    }
                }
            },
            confirmButton = {
                if (!submitted) {
                    Button(onClick = {
                        viewModel.submitFeedback(rating, category, comment)
                        submitted = true
                    }) {
                        Text("Submit Feedback")
                    }
                } else {
                    TextButton(onClick = { showFeedbackDialog = false }) {
                        Text("Done")
                    }
                }
            },
            dismissButton = {
                if (!submitted) {
                    TextButton(onClick = { showFeedbackDialog = false }) {
                        Text("Cancel")
                    }
                }
            }
        )
    }
}
