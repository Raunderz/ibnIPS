package com.ibnips.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import com.ibnips.app.data.model.*
import com.ibnips.app.data.network.ApiClient
import com.ibnips.app.data.network.AuthStore
import com.ibnips.app.data.network.CampusNetworkAdapter
import com.ibnips.app.data.repository.CampusRepository
import com.ibnips.app.data.wifi.AndroidWifiScanner
import com.ibnips.app.ui.components.BottomNavigationBar
import com.ibnips.app.ui.navigation.Screen
import com.ibnips.app.ui.screens.*
import com.ibnips.app.ui.theme.IbnIPSTheme
import com.ibnips.app.ui.viewmodel.*
import java.util.UUID

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val wifiScanner = AndroidWifiScanner(this)
        
        enableEdgeToEdge()
        setContent {
            IbnIPSTheme {
                MainAppContent(wifiScanner)
            }
        }
    }
}

@Composable
fun MainAppContent(wifiScanner: AndroidWifiScanner) {
    // One repository for both the network adapter and the view model, so a
    // room synced from GET /api/map is the same object the screens read.
    val context = LocalContext.current
    val repository = remember { CampusRepository() }
    val authStore = remember { AuthStore(context) }
    val networkAdapter = remember { CampusNetworkAdapter(ApiClient.apiService, repository) }
    var currentScreen by remember { mutableStateOf(Screen.Home) }
    var selectedBuildingId by remember { mutableStateOf<String?>(null) }
    var selectedFloorId by remember { mutableStateOf<String?>(null) }
    
    // State for location registration flow (Phase 5A/B/C)
    var reviewBlockId by remember { mutableStateOf("") }
    var reviewFloorId by remember { mutableStateOf("") }
    var reviewLocationType by remember { mutableStateOf(MappingLocationType.ROOM) }
    var reviewDetails by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    
    // State for Map Position Picker (Phase 5C)
    var pickingItemType by remember { mutableStateOf("") }
    var pickingItemId by remember { mutableStateOf("") }
    var pickingBlockId by remember { mutableStateOf("") }
    var pickingFloorId by remember { mutableStateOf("") }
    var pickingInitialX by remember { mutableStateOf<Float?>(null) }
    var pickingInitialY by remember { mutableStateOf<Float?>(null) }

    // State for Wi-Fi Calibration (Phase 6B)
    var calibLocationId by remember { mutableStateOf("") }
    var calibLocationType by remember { mutableStateOf(MappingLocationType.ROOM) }
    var calibBlockId by remember { mutableStateOf("") }
    var calibFloorId by remember { mutableStateOf("") }
    var calibDisplayName by remember { mutableStateOf("") }
    
    val authViewModel: AuthViewModel = viewModel(
        factory = AuthViewModelFactory(networkAdapter, authStore)
    )
    val authState by authViewModel.uiState.collectAsState()

    val viewModel: CampusViewModel = viewModel(
        factory = CampusViewModelFactory(repository, networkAdapter)
    )
    val wifiScannerViewModel: WifiScannerViewModel = viewModel(
        factory = WifiScannerViewModelFactory(wifiScanner)
    )
    val positioningViewModel: IndoorPositioningViewModel = viewModel(
        factory = IndoorPositioningViewModelFactory(
            campusViewModel = viewModel,
            wifiScanner = wifiScanner,
            networkAdapter = networkAdapter,
            authToken = { authViewModel.token },
            onUnauthorized = { reason -> authViewModel.signOut(reason) }
        )
    )
    val navigationViewModel: NavigationViewModel = viewModel(
        factory = NavigationViewModelFactory(viewModel)
    )

    // Every authenticated screen is behind this, so the whole app waits on a
    // token rather than each screen handling a 401 on its own.
    if (authState.state != AuthState.SIGNED_IN) {
        LoginScreen(
            viewModel = authViewModel,
            signedOutReason = authViewModel.signedOutReason
        )
        return
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        bottomBar = {
            if (currentScreen == Screen.Home || 
                currentScreen == Screen.Map || 
                currentScreen == Screen.Navigate || 
                currentScreen == Screen.More) {
                BottomNavigationBar(
                    currentScreen = currentScreen,
                    onScreenSelected = { screen ->
                        currentScreen = screen
                        if (screen != Screen.Map) {
                            selectedFloorId = null
                        }
                    }
                )
            }
        }
    ) { innerPadding ->
        val modifier = Modifier.padding(innerPadding)
        
        when (currentScreen) {
            Screen.Home -> {
                HomeScreen(
                    viewModel = viewModel,
                    onNavigateToScreen = { screen, buildingId ->
                        if (screen == Screen.BuildingDetail && buildingId != null) {
                            selectedBuildingId = buildingId
                        }
                        currentScreen = screen
                    },
                    modifier = modifier
                )
            }
            Screen.Map -> {
                MapScreen(
                    blockId = selectedBuildingId,
                    floorId = selectedFloorId,
                    viewModel = viewModel,
                    onBack = {
                        currentScreen = Screen.Home
                    },
                    modifier = modifier
                )
            }
            Screen.Navigate -> {
                NavigateScreen(
                    campusViewModel = viewModel,
                    positioningViewModel = positioningViewModel,
                    navigationViewModel = navigationViewModel,
                    modifier = modifier
                )
            }
            Screen.More -> {
                MoreScreen(
                    onNavigateToAdmin = {
                        currentScreen = Screen.AdminMapping
                    },
                    onNavigateToWifiTest = {
                        currentScreen = Screen.WifiScannerTest
                    },
                    modifier = modifier
                )
            }
            Screen.BuildingDetail -> {
                BuildingScreen(
                    blockId = selectedBuildingId ?: "",
                    viewModel = viewModel,
                    onBack = {
                        currentScreen = Screen.Home
                        selectedBuildingId = null
                    },
                    onViewMap = { bId, fId ->
                        selectedBuildingId = bId
                        selectedFloorId = fId
                        currentScreen = Screen.Map
                    },
                    modifier = modifier
                )
            }
            Screen.AdminMapping -> {
                AdminScreen(
                    onAccessGranted = {
                        currentScreen = Screen.MappingDashboard
                    },
                    onBack = {
                        currentScreen = Screen.More
                    },
                    modifier = modifier
                )
            }
            Screen.MappingDashboard -> {
                MappingDashboardScreen(
                    viewModel = viewModel,
                    onAddRoom = { currentScreen = Screen.AddRoom },
                    onAddCheckpoint = { currentScreen = Screen.AddCheckpoint },
                    onAddFacility = { currentScreen = Screen.AddFacility },
                    onNavigationMapping = { currentScreen = Screen.NavigationMapping },
                    onSetPosition = { type, id, bId, fId, x, y ->
                        pickingItemType = type
                        pickingItemId = id
                        pickingBlockId = bId
                        pickingFloorId = fId
                        pickingInitialX = x
                        pickingInitialY = y
                        currentScreen = Screen.MapPositionPicker
                    },
                    onWifiCalibration = { id, type, bId, fId, name ->
                        calibLocationId = id
                        calibLocationType = type
                        calibBlockId = bId
                        calibFloorId = fId
                        calibDisplayName = name
                        currentScreen = Screen.WifiCalibration
                    },
                    onBack = { currentScreen = Screen.More },
                    modifier = modifier
                )
            }
            Screen.AddRoom -> {
                AddRoomScreen(
                    viewModel = viewModel,
                    onContinue = { bId, fId, rNum, dName, rType ->
                        val room = Room(
                            id = UUID.randomUUID().toString(),
                            blockId = bId,
                            floorId = fId,
                            roomNumber = rNum,
                            displayName = dName,
                            type = rType,
                            isMapped = false
                        )
                        viewModel.addRoom(room)
                        currentScreen = Screen.MappingDashboard
                    },
                    onBack = { currentScreen = Screen.MappingDashboard },
                    modifier = modifier
                )
            }
            Screen.AddCheckpoint -> {
                AddCheckpointScreen(
                    viewModel = viewModel,
                    onContinue = { bId, fId, cId, dName ->
                        val checkpoint = Checkpoint(
                            id = UUID.randomUUID().toString(),
                            blockId = bId,
                            floorId = fId,
                            checkpointId = cId,
                            displayName = dName,
                            isMapped = false
                        )
                        viewModel.addCheckpoint(checkpoint)
                        currentScreen = Screen.MappingDashboard
                    },
                    onBack = { currentScreen = Screen.MappingDashboard },
                    modifier = modifier
                )
            }
            Screen.AddFacility -> {
                AddFacilityScreen(
                    viewModel = viewModel,
                    onContinue = { bId, fId, fType, dName ->
                        val facility = Facility(
                            id = UUID.randomUUID().toString(),
                            blockId = bId,
                            floorId = fId,
                            name = dName,
                            type = fType,
                            isMapped = false
                        )
                        viewModel.addFacility(facility)
                        currentScreen = Screen.MappingDashboard
                    },
                    onBack = { currentScreen = Screen.MappingDashboard },
                    modifier = modifier
                )
            }
            Screen.MapPositionPicker -> {
                MapPositionPickerScreen(
                    blockId = pickingBlockId,
                    floorId = pickingFloorId,
                    viewModel = viewModel,
                    initialX = pickingInitialX,
                    initialY = pickingInitialY,
                    onPositionSelected = { x, y ->
                        when (pickingItemType) {
                            "ROOM" -> {
                                val room = viewModel.getAllRooms().find { it.id == pickingItemId }
                                if (room != null) {
                                    viewModel.updateRoom(room.copy(x = x, y = y, isMapped = true))
                                }
                            }
                            "CHECKPOINT" -> {
                                val checkpoint = viewModel.getAllCheckpoints().find { it.id == pickingItemId }
                                if (checkpoint != null) {
                                    viewModel.updateCheckpoint(checkpoint.copy(x = x, y = y, isMapped = true))
                                }
                            }
                            "FACILITY" -> {
                                val facility = viewModel.getAllFacilities().find { it.id == pickingItemId }
                                if (facility != null) {
                                    viewModel.updateFacility(facility.copy(x = x, y = y, isMapped = true))
                                }
                            }
                        }
                        currentScreen = Screen.MappingDashboard
                    },
                    onBack = { currentScreen = Screen.MappingDashboard },
                    modifier = modifier
                )
            }
            Screen.MappingReview -> {
                MappingReviewScreen(
                    viewModel = viewModel,
                    blockId = reviewBlockId,
                    floorId = reviewFloorId,
                    locationType = reviewLocationType,
                    details = reviewDetails,
                    x = null,
                    y = null,
                    onSaveComplete = {
                        currentScreen = Screen.MappingDashboard
                    },
                    onBack = {
                        currentScreen = Screen.MappingDashboard
                    },
                    modifier = modifier
                )
            }
            Screen.WifiScannerTest -> {
                WifiScannerTestScreen(
                    viewModel = wifiScannerViewModel,
                    onBack = {
                        currentScreen = Screen.More
                    },
                    modifier = modifier
                )
            }
            Screen.WifiCalibration -> {
                WifiCalibrationScreen(
                    locationId = calibLocationId,
                    locationType = calibLocationType,
                    blockId = calibBlockId,
                    floorId = calibFloorId,
                    displayName = calibDisplayName,
                    campusViewModel = viewModel,
                    wifiScannerViewModel = wifiScannerViewModel,
                    onBack = {
                        currentScreen = Screen.MappingDashboard
                    },
                    modifier = modifier
                )
            }
            Screen.IndoorPositioning -> {
                IndoorPositioningScreen(
                    viewModel = positioningViewModel,
                    campusViewModel = viewModel,
                    onBack = {
                        currentScreen = Screen.Home
                        positioningViewModel.reset()
                    },
                    modifier = modifier
                )
            }
            Screen.NavigationMapping -> {
                NavigationMappingScreen(
                    viewModel = viewModel,
                    onBack = {
                        currentScreen = Screen.MappingDashboard
                    },
                    modifier = modifier
                )
            }
            else -> {
                currentScreen = Screen.Home
            }
        }
    }
}
