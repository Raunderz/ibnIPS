package com.ibnips.app.ui.viewmodel

import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import com.ibnips.app.data.model.*
import com.ibnips.app.data.repository.CampusRepository
import com.ibnips.app.domain.navigation.NavigationGraph
import java.util.Calendar
import java.util.Locale

class CampusViewModel(private val repository: CampusRepository = CampusRepository()) : ViewModel() {

    private val _blocks = mutableStateOf(repository.getBlocks())
    val blocks: State<List<CampusBlock>> = _blocks

    private val _searchResults = mutableStateOf<List<SearchResult>>(emptyList())
    val searchResults: State<List<SearchResult>> = _searchResults

    fun getFloors(blockId: String): List<CampusFloor> {
        return repository.getFloors(blockId)
    }

    fun getAllRooms(): List<Room> = repository.getAllRooms()

    fun getAllFacilities(): List<Facility> = repository.getAllFacilities()

    fun getAllCheckpoints(): List<Checkpoint> = repository.getAllCheckpoints()

    fun getRooms(blockId: String, floorId: String): List<Room> {
        return repository.getRooms(blockId, floorId)
    }

    fun getFacilities(blockId: String, floorId: String): List<Facility> {
        return repository.getFacilities(blockId, floorId)
    }

    fun getCheckpoints(blockId: String, floorId: String): List<Checkpoint> {
        return repository.getCheckpoints(blockId, floorId)
    }

    fun onSearchQueryChanged(query: String) {
        if (query.isBlank()) {
            _searchResults.value = emptyList()
            return
        }
        
        val results = mutableListOf<SearchResult>()
        
        // Search Rooms
        repository.searchRooms(query).forEach { room ->
            results.add(SearchResult.RoomResult(room))
        }
        
        // Search Sections
        repository.searchSections(query).forEach { section ->
            results.add(SearchResult.SectionResult(section))
        }
        
        // Search Subjects (Class Schedules)
        repository.searchSubjects(query).forEach { schedule ->
            results.add(SearchResult.SubjectResult(schedule))
        }
        
        // Search Facilities
        repository.getAllFacilities().filter { 
            it.name.contains(query, ignoreCase = true) 
        }.forEach { facility ->
            results.add(SearchResult.FacilityResult(facility))
        }
        
        _searchResults.value = results
    }

    // Admin Calibration helpers
    fun getMappedLocationsCount(blockId: String, floorId: String): Int {
        return repository.getMappedLocationsCount(blockId, floorId)
    }

    fun getCalibrationPoints(blockId: String, floorId: String): List<CalibrationPoint> {
        return repository.getCalibrationPoints(blockId, floorId)
    }

    fun isRoomExists(blockId: String, floorId: String, roomNumber: String): Boolean {
        return repository.getRooms(blockId, floorId).any { it.roomNumber.equals(roomNumber, ignoreCase = true) }
    }

    fun addRoom(room: Room) {
        repository.addRoom(room)
        refreshBlocks()
    }

    fun updateRoom(room: Room) {
        repository.updateRoom(room)
        refreshBlocks()
    }

    fun deleteRoom(id: String) {
        repository.deleteRoom(id)
        refreshBlocks()
    }

    fun addFacility(facility: Facility) {
        repository.addFacility(facility)
        refreshBlocks()
    }

    fun updateFacility(facility: Facility) {
        repository.updateFacility(facility)
        refreshBlocks()
    }

    fun deleteFacility(id: String) {
        repository.deleteFacility(id)
        refreshBlocks()
    }

    fun addCheckpoint(checkpoint: Checkpoint) {
        repository.addCheckpoint(checkpoint)
        refreshBlocks()
    }

    fun updateCheckpoint(checkpoint: Checkpoint) {
        repository.updateCheckpoint(checkpoint)
        refreshBlocks()
    }

    fun deleteCheckpoint(id: String) {
        repository.deleteCheckpoint(id)
        refreshBlocks()
    }

    fun addCalibrationPoint(point: CalibrationPoint) {
        repository.addCalibrationPoint(point)
    }

    fun deleteCalibrationPoint(id: String) {
        repository.deleteCalibrationPoint(id)
    }

    // Navigation methods
    fun addNavigationNode(node: NavigationNode) {
        repository.addNavigationNode(node)
    }

    fun deleteNavigationNode(id: String) {
        repository.deleteNavigationNode(id)
    }

    fun getAllNavigationNodes(): List<NavigationNode> = repository.getAllNavigationNodes()

    fun getNavigationNode(id: String): NavigationNode? = repository.getNavigationNode(id)

    fun addNavigationEdge(edge: NavigationEdge) {
        repository.addNavigationEdge(edge)
    }

    fun updateNavigationEdge(edge: NavigationEdge) {
        repository.updateNavigationEdge(edge)
    }

    fun deleteNavigationEdge(id: String) {
        repository.deleteNavigationEdge(id)
    }

    fun getNavigationEdges(): List<NavigationEdge> = repository.getNavigationEdges()

    fun getNavigationGraph(): NavigationGraph {
        return NavigationGraph(
            nodes = repository.getAllNavigationNodes(),
            edges = repository.getNavigationEdges()
        )
    }

    // Wi-Fi Fingerprint methods
    fun saveWifiFingerprint(fingerprint: WifiFingerprint) {
        repository.saveWifiFingerprint(fingerprint)
        refreshBlocks()
    }

    fun getWifiFingerprint(locationId: String): WifiFingerprint? {
        return repository.getWifiFingerprint(locationId)
    }

    fun getAllWifiFingerprints(): List<WifiFingerprint> {
        return repository.getAllWifiFingerprints()
    }

    fun deleteWifiFingerprint(locationId: String) {
        repository.deleteWifiFingerprint(locationId)
        refreshBlocks()
    }

    fun hasWifiFingerprint(locationId: String): Boolean {
        return repository.hasWifiFingerprint(locationId)
    }

    private fun refreshBlocks() {
        _blocks.value = repository.getBlocks().toList()
    }

    // Phase 10 Enhancement Methods
    
    fun getSection(id: String): Section? = repository.getSection(id)
    
    fun getRoomsForSection(section: Section): List<Room> {
        return section.roomIds.mapNotNull { repository.getRoom(it) }
    }
    
    fun getTodaySchedule(sectionId: String): List<ClassSchedule> {
        val calendar = Calendar.getInstance()
        val day = calendar.getDisplayName(Calendar.DAY_OF_WEEK, Calendar.LONG, Locale.getDefault())
        return repository.getClassSchedules(sectionId, day ?: "")
    }
    
    fun getNextClass(sectionId: String): ClassSchedule? {
        val todayClasses = getTodaySchedule(sectionId)
        return todayClasses.firstOrNull()
    }

    fun submitFeedback(rating: Int, category: String, comment: String) {
        val feedback = Feedback(
            id = java.util.UUID.randomUUID().toString(),
            rating = rating,
            category = category,
            comment = comment,
            timestamp = System.currentTimeMillis()
        )
        repository.addFeedback(feedback)
    }
}

sealed class SearchResult {
    data class RoomResult(val room: Room) : SearchResult()
    data class SectionResult(val section: Section) : SearchResult()
    data class SubjectResult(val schedule: ClassSchedule) : SearchResult()
    data class FacilityResult(val facility: Facility) : SearchResult()
}
