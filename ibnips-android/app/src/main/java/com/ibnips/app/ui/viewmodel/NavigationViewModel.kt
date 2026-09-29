package com.ibnips.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibnips.app.data.model.IndoorLocation
import com.ibnips.app.data.model.NavigationNode
import com.ibnips.app.data.model.Route
import com.ibnips.app.domain.navigation.Pathfinder
import com.ibnips.app.domain.navigation.RoutePreference
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlin.math.sqrt

class NavigationViewModel(private val campusViewModel: CampusViewModel) : ViewModel() {

    // Centralized thresholds (map units/pixels)
    private val OFF_ROUTE_THRESHOLD = 30.0f
    private val DESTINATION_REACHED_THRESHOLD = 15.0f

    private val _navigationState = MutableStateFlow(NavigationState.IDLE)
    val navigationState: StateFlow<NavigationState> = _navigationState.asStateFlow()

    private val _startNode = MutableStateFlow<NavigationNode?>(null)
    val startNode: StateFlow<NavigationNode?> = _startNode.asStateFlow()

    private val _destinationNode = MutableStateFlow<NavigationNode?>(null)
    val destinationNode: StateFlow<NavigationNode?> = _destinationNode.asStateFlow()

    private val _routePreference = MutableStateFlow(RoutePreference.SHORTEST)
    val routePreference: StateFlow<RoutePreference> = _routePreference.asStateFlow()

    private val _calculatedRoute = MutableStateFlow<Route?>(null)
    val calculatedRoute: StateFlow<Route?> = _calculatedRoute.asStateFlow()

    // Live navigation properties
    private val _remainingDistance = MutableStateFlow(0f)
    val remainingDistance: StateFlow<Float> = _remainingDistance.asStateFlow()

    private val _estimatedTimeRemaining = MutableStateFlow(0)
    val estimatedTimeRemaining: StateFlow<Int> = _estimatedTimeRemaining.asStateFlow()

    private val _currentInstruction = MutableStateFlow("")
    val currentInstruction: StateFlow<String> = _currentInstruction.asStateFlow()

    private var navigationJob: Job? = null

    fun setStartNode(node: NavigationNode?) {
        _startNode.value = node
        calculateRouteIfPossible()
    }

    fun setDestinationNode(node: NavigationNode?) {
        _destinationNode.value = node
        calculateRouteIfPossible()
    }

    fun setRoutePreference(preference: RoutePreference) {
        _routePreference.value = preference
        calculateRouteIfPossible()
    }

    private fun calculateRouteIfPossible() {
        val start = _startNode.value
        val dest = _destinationNode.value
        
        if (start == null || dest == null) {
            _calculatedRoute.value = null
            if (_navigationState.value != NavigationState.NAVIGATING && 
                _navigationState.value != NavigationState.OFF_ROUTE &&
                _navigationState.value != NavigationState.REROUTING) {
                _navigationState.value = NavigationState.IDLE
            }
            return
        }

        viewModelScope.launch {
            if (_navigationState.value != NavigationState.REROUTING) {
                _navigationState.value = NavigationState.CALCULATING
            }
            
            val graph = campusViewModel.getNavigationGraph()
            val pathfinder = Pathfinder(graph)
            
            val route = pathfinder.findPath(start.id, dest.id, _routePreference.value)
            
            if (route != null) {
                _calculatedRoute.value = route
                if (_navigationState.value == NavigationState.REROUTING) {
                    _navigationState.value = NavigationState.NAVIGATING
                } else {
                    _navigationState.value = NavigationState.ROUTE_FOUND
                }
                updateRouteProgress(null) // Initialize progress
            } else {
                _calculatedRoute.value = null
                _navigationState.value = NavigationState.NO_ROUTE
            }
        }
    }

    fun startNavigation(positioningViewModel: IndoorPositioningViewModel) {
        if (_calculatedRoute.value == null) return
        
        _navigationState.value = NavigationState.NAVIGATING
        
        navigationJob?.cancel()
        navigationJob = viewModelScope.launch {
            // Live loop for Wi-Fi scanning and route checking
            while (_navigationState.value == NavigationState.NAVIGATING || 
                   _navigationState.value == NavigationState.OFF_ROUTE ||
                   _navigationState.value == NavigationState.REROUTING) {
                
                // Request a fresh scan through the positioning viewmodel
                positioningViewModel.startPositioning()
                
                // Wait for the positioning state to finish scanning/matching
                // We'll give it a bit of time to update or observe it
                delay(12000) // ~12 seconds interval for Wi-Fi scans
                
                val location = positioningViewModel.currentLocation.value
                if (location != null) {
                    processLocationUpdate(location)
                }
            }
        }
    }

    private fun processLocationUpdate(location: IndoorLocation) {
        val route = _calculatedRoute.value ?: return
        val destNode = _destinationNode.value ?: return

        // 1. Check if destination reached
        val distToDest = calculateDistance(location.x, location.y, destNode.x, destNode.y)
        if (location.floorId == destNode.floorId && location.blockId == destNode.blockId && distToDest < DESTINATION_REACHED_THRESHOLD) {
            _navigationState.value = NavigationState.DESTINATION_REACHED
            _remainingDistance.value = 0f
            _estimatedTimeRemaining.value = 0
            _currentInstruction.value = "You have arrived at ${destNode.id}"
            return
        }

        // 2. Check if off-route
        var minNodeDist = Float.MAX_VALUE
        var nearestNodeOnRoute: NavigationNode? = null
        
        route.nodeIds.forEach { nodeId ->
            val node = campusViewModel.getNavigationNode(nodeId)
            if (node != null && node.floorId == location.floorId && node.blockId == location.blockId) {
                val d = calculateDistance(location.x, location.y, node.x, node.y)
                if (d < minNodeDist) {
                    minNodeDist = d
                    nearestNodeOnRoute = node
                }
            }
        }

        if (minNodeDist > OFF_ROUTE_THRESHOLD) {
            _navigationState.value = NavigationState.OFF_ROUTE
            handleOffRoute(location)
        } else {
            // Still on route, update progress
            updateRouteProgress(nearestNodeOnRoute)
            updateInstruction(nearestNodeOnRoute, route)
        }
    }

    private fun handleOffRoute(location: IndoorLocation) {
        _navigationState.value = NavigationState.REROUTING
        
        // Find nearest navigation node to current estimated position
        val allNodes = campusViewModel.getNavigationGraph().nodes
        var minD = Float.MAX_VALUE
        var nearestStartNode: NavigationNode? = null
        
        allNodes.filter { it.floorId == location.floorId && it.blockId == location.blockId }.forEach { node ->
            val d = calculateDistance(location.x, location.y, node.x, node.y)
            if (d < minD) {
                minD = d
                nearestStartNode = node
            }
        }
        
        if (nearestStartNode != null) {
            _startNode.value = nearestStartNode
            calculateRouteIfPossible()
        } else {
            // Could not find a node nearby
            _navigationState.value = NavigationState.LOCATION_UNAVAILABLE
        }
    }

    private fun updateRouteProgress(currentNode: NavigationNode?) {
        val route = _calculatedRoute.value ?: return
        
        if (currentNode == null) {
            _remainingDistance.value = route.totalDistance
            _estimatedTimeRemaining.value = route.estimatedTimeMinutes
            return
        }

        val nodeIndex = route.nodeIds.indexOf(currentNode.id)
        if (nodeIndex == -1) return

        var remDist = 0f
        for (i in nodeIndex until route.nodeIds.size - 1) {
            val from = campusViewModel.getNavigationNode(route.nodeIds[i])
            val to = campusViewModel.getNavigationNode(route.nodeIds[i+1])
            if (from != null && to != null) {
                if (from.floorId == to.floorId && from.blockId == to.blockId) {
                    remDist += calculateDistance(from.x, from.y, to.x, to.y)
                } else {
                    remDist += 5f // Penalty/weight for floor change
                }
            }
        }
        
        _remainingDistance.value = remDist
        _estimatedTimeRemaining.value = (remDist / 1.4f / 60f).toInt().coerceAtLeast(1)
    }

    private fun updateInstruction(currentNode: NavigationNode?, route: Route) {
        if (currentNode == null) {
            _currentInstruction.value = "Proceed to the starting point"
            return
        }

        val nodeIndex = route.nodeIds.indexOf(currentNode.id)
        if (nodeIndex == -1 || nodeIndex >= route.nodeIds.size - 1) return

        val nextNodeId = route.nodeIds[nodeIndex + 1]
        val nextNode = campusViewModel.getNavigationNode(nextNodeId)
        
        if (nextNode != null) {
            if (nextNode.floorId != currentNode.floorId) {
                val transition = if (nextNode.type == com.ibnips.app.data.model.NavigationNodeType.STAIRS) "stairs" else "lift"
                _currentInstruction.value = "Take $transition to Floor ${nextNode.floorId.last()}"
            } else {
                _currentInstruction.value = "Continue on Floor ${currentNode.floorId.last()}"
            }
        }
    }

    private fun calculateDistance(x1: Float, y1: Float, x2: Float, y2: Float): Float {
        val dx = x1 - x2
        val dy = y1 - y2
        return sqrt(dx * dx + dy * dy)
    }

    fun stopNavigation() {
        navigationJob?.cancel()
        if (_navigationState.value != NavigationState.DESTINATION_REACHED) {
            _navigationState.value = NavigationState.ROUTE_FOUND
        }
    }

    fun clearNavigation() {
        stopNavigation()
        _startNode.value = null
        _destinationNode.value = null
        _calculatedRoute.value = null
        _navigationState.value = NavigationState.IDLE
    }

    enum class NavigationState {
        IDLE,
        CALCULATING,
        ROUTE_FOUND,
        ROUTE_READY,
        NO_ROUTE,
        NAVIGATING,
        OFF_ROUTE,
        REROUTING,
        DESTINATION_REACHED,
        LOCATION_UNAVAILABLE,
        ERROR
    }
}
