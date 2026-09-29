package com.ibnips.app.data.repository

import com.ibnips.app.data.model.*
import com.ibnips.app.domain.navigation.NavigationGraph

class CampusRepository {

    private val blocks = listOf(
        CampusBlock("block_a", "A", "Block A", "Ground + 3 Floors", 4),
        CampusBlock("block_b", "B", "Block B", "Ground + 3 Floors", 4),
        CampusBlock("block_c", "C", "Block C", "Ground + 3 Floors", 4)
    )

    private val floors = blocks.flatMap { block ->
        listOf(
            CampusFloor("${block.id}_g", block.id, 0, "Ground Floor"),
            CampusFloor("${block.id}_f1", block.id, 1, "Floor 1"),
            CampusFloor("${block.id}_f2", block.id, 2, "Floor 2"),
            CampusFloor("${block.id}_f3", block.id, 3, "Floor 3")
        )
    }

    private val rooms = mutableListOf<Room>()
    private val facilities = mutableListOf<Facility>()
    private val checkpoints = mutableListOf<Checkpoint>()
    private val navigationNodes = mutableListOf<NavigationNode>()
    private val navigationEdges = mutableListOf<NavigationEdge>()
    private val calibrationPoints = mutableListOf<CalibrationPoint>()
    private val wifiFingerprints = mutableListOf<WifiFingerprint>()
    
    // New local storage for Phase 10 Enhancements
    private val sections = mutableListOf<Section>()
    private val classSchedules = mutableListOf<ClassSchedule>()
    private val feedbacks = mutableListOf<Feedback>()

    fun getBlocks(): List<CampusBlock> = blocks

    fun getFloors(blockId: String): List<CampusFloor> {
        return floors.filter { it.blockId == blockId }
    }

    fun getRooms(blockId: String, floorId: String): List<Room> {
        return rooms.filter { it.blockId == blockId && it.floorId == floorId }
    }

    fun getAllRooms(): List<Room> = rooms.toList()

    fun getFacilities(blockId: String, floorId: String): List<Facility> {
        return facilities.filter { it.blockId == blockId && it.floorId == floorId }
    }

    fun getAllFacilities(): List<Facility> = facilities.toList()

    fun getCheckpoints(blockId: String, floorId: String): List<Checkpoint> {
        return checkpoints.filter { it.blockId == blockId && it.floorId == floorId }
    }

    fun getAllCheckpoints(): List<Checkpoint> = checkpoints.toList()

    fun getRoom(roomId: String): Room? {
        return rooms.find { it.id == roomId }
    }

    fun searchRooms(query: String): List<Room> {
        if (query.isBlank()) return emptyList()
        return rooms.filter { 
            it.roomNumber.contains(query, ignoreCase = true) || 
            it.displayName.contains(query, ignoreCase = true) 
        }
    }

    fun addRoom(room: Room) {
        if (!rooms.any { it.blockId == room.blockId && it.floorId == room.floorId && it.roomNumber.equals(room.roomNumber, ignoreCase = true) }) {
            rooms.add(room)
        }
    }

    fun addFacility(facility: Facility) {
        facilities.add(facility)
    }

    fun addCheckpoint(checkpoint: Checkpoint) {
        if (!checkpoints.any { it.blockId == checkpoint.blockId && it.floorId == checkpoint.floorId && it.checkpointId.equals(checkpoint.checkpointId, ignoreCase = true) }) {
            checkpoints.add(checkpoint)
        }
    }

    fun addNavigationNode(node: NavigationNode) {
        if (!navigationNodes.any { it.id == node.id }) {
            navigationNodes.add(node)
        }
    }

    fun deleteNavigationNode(id: String) {
        navigationNodes.removeAll { it.id == id }
    }

    fun getAllNavigationNodes(): List<NavigationNode> = navigationNodes.toList()

    fun getNavigationNode(id: String): NavigationNode? = navigationNodes.find { it.id == id }

    fun addNavigationEdge(edge: NavigationEdge) {
        if (!navigationEdges.any { it.id == edge.id }) {
            navigationEdges.add(edge)
        }
    }

    fun updateNavigationEdge(edge: NavigationEdge) {
        val idx = navigationEdges.indexOfFirst { it.id == edge.id }
        if (idx != -1) {
            navigationEdges[idx] = edge
        }
    }

    fun deleteNavigationEdge(id: String) {
        navigationEdges.removeAll { it.id == id }
    }

    fun getNavigationEdges(): List<NavigationEdge> = navigationEdges.toList()

    fun getNavigationGraph(): NavigationGraph {
        return NavigationGraph(navigationNodes.toList(), navigationEdges.toList())
    }

    fun addCalibrationPoint(point: CalibrationPoint) {
        calibrationPoints.add(point)
    }

    fun updateRoom(room: Room) {
        val idx = rooms.indexOfFirst { it.id == room.id }
        if (idx != -1) {
            rooms[idx] = room
        }
    }

    fun updateFacility(facility: Facility) {
        val idx = facilities.indexOfFirst { it.id == facility.id }
        if (idx != -1) {
            facilities[idx] = facility
        }
    }

    fun updateCheckpoint(checkpoint: Checkpoint) {
        val idx = checkpoints.indexOfFirst { it.id == checkpoint.id }
        if (idx != -1) {
            checkpoints[idx] = checkpoint
        }
    }

    fun deleteRoom(id: String) {
        rooms.removeAll { it.id == id }
        wifiFingerprints.removeAll { it.locationId == id }
    }

    fun deleteFacility(id: String) {
        facilities.removeAll { it.id == id }
        wifiFingerprints.removeAll { it.locationId == id }
    }

    fun deleteCheckpoint(id: String) {
        checkpoints.removeAll { it.id == id }
        wifiFingerprints.removeAll { it.locationId == id }
    }

    fun deleteCalibrationPoint(id: String) {
        calibrationPoints.removeAll { it.id == id }
    }

    fun getMappedLocationsCount(blockId: String, floorId: String): Int {
        return if (blockId.isEmpty()) {
            rooms.count { it.isMapped } + facilities.count { it.isMapped } + checkpoints.count { it.isMapped }
        } else if (floorId.isEmpty()) {
            rooms.count { it.blockId == blockId && it.isMapped } + 
            facilities.count { it.blockId == blockId && it.isMapped } + 
            checkpoints.count { it.blockId == blockId && it.isMapped }
        } else {
            rooms.count { it.blockId == blockId && it.floorId == floorId && it.isMapped } + 
            facilities.count { it.blockId == blockId && it.floorId == floorId && it.isMapped } + 
            checkpoints.count { it.blockId == blockId && it.floorId == floorId && it.isMapped }
        }
    }

    fun getCalibrationPoints(blockId: String, floorId: String): List<CalibrationPoint> {
        return calibrationPoints.filter { it.blockId == blockId && it.floorId == floorId }
    }

    // Wi-Fi Fingerprint methods
    fun saveWifiFingerprint(fingerprint: WifiFingerprint) {
        wifiFingerprints.removeAll { it.locationId == fingerprint.locationId }
        wifiFingerprints.add(fingerprint)
    }

    fun getWifiFingerprint(locationId: String): WifiFingerprint? {
        return wifiFingerprints.find { it.locationId == locationId }
    }

    fun getAllWifiFingerprints(): List<WifiFingerprint> = wifiFingerprints.toList()

    fun deleteWifiFingerprint(locationId: String) {
        wifiFingerprints.removeAll { it.locationId == locationId }
    }

    fun hasWifiFingerprint(locationId: String): Boolean {
        return wifiFingerprints.any { it.locationId == locationId }
    }
    
    // Phase 10 Enhancement Methods
    
    fun searchSections(query: String): List<Section> {
        if (query.isBlank()) return emptyList()
        return sections.filter { it.name.contains(query, ignoreCase = true) }
    }
    
    fun getSection(id: String): Section? = sections.find { it.id == id }
    
    fun addSection(section: Section) {
        if (!sections.any { it.id == section.id }) {
            sections.add(section)
        }
    }

    fun getClassSchedules(sectionId: String, day: String): List<ClassSchedule> {
        return classSchedules.filter { it.sectionId == sectionId && it.day.equals(day, ignoreCase = true) }
    }
    
    fun searchSubjects(query: String): List<ClassSchedule> {
        if (query.isBlank()) return emptyList()
        return classSchedules.filter { it.subject.contains(query, ignoreCase = true) }
    }
    
    fun addClassSchedule(schedule: ClassSchedule) {
        classSchedules.add(schedule)
    }
    
    fun addFeedback(feedback: Feedback) {
        feedbacks.add(feedback)
    }
    
    fun getAllFeedbacks(): List<Feedback> = feedbacks.toList()
}
