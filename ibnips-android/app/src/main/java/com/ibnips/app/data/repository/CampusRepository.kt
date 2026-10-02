package com.ibnips.app.data.repository

import com.ibnips.app.data.model.*
import com.ibnips.app.domain.navigation.NavigationGraph

// Every accessor is synchronized because the collections below are now written
// from two threads at once: `CampusNetworkAdapter.syncNodesAndMap` fills them
// on Dispatchers.IO while Compose reads them on the main thread. Unsynchronized
// `mutableListOf` iteration throws ConcurrentModificationException under exactly
// that pattern. Every getter returns a copy, so no iteration escapes the lock.
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

    @Synchronized
    fun getBlocks(): List<CampusBlock> = blocks

    @Synchronized
    fun getFloors(blockId: String): List<CampusFloor> {
        return floors.filter { it.blockId == blockId }
    }

    @Synchronized
    fun getRooms(blockId: String, floorId: String): List<Room> {
        return rooms.filter { it.blockId == blockId && it.floorId == floorId }
    }

    @Synchronized
    fun getAllRooms(): List<Room> = rooms.toList()

    @Synchronized
    fun getFacilities(blockId: String, floorId: String): List<Facility> {
        return facilities.filter { it.blockId == blockId && it.floorId == floorId }
    }

    @Synchronized
    fun getAllFacilities(): List<Facility> = facilities.toList()

    @Synchronized
    fun getCheckpoints(blockId: String, floorId: String): List<Checkpoint> {
        return checkpoints.filter { it.blockId == blockId && it.floorId == floorId }
    }

    @Synchronized
    fun getAllCheckpoints(): List<Checkpoint> = checkpoints.toList()

    @Synchronized
    fun getRoom(roomId: String): Room? {
        return rooms.find { it.id == roomId }
    }

    @Synchronized
    fun searchRooms(query: String): List<Room> {
        if (query.isBlank()) return emptyList()
        return rooms.filter { 
            it.roomNumber.contains(query, ignoreCase = true) || 
            it.displayName.contains(query, ignoreCase = true) 
        }
    }

    @Synchronized
    fun addRoom(room: Room) {
        if (!rooms.any { it.blockId == room.blockId && it.floorId == room.floorId && it.roomNumber.equals(room.roomNumber, ignoreCase = true) }) {
            rooms.add(room)
        }
    }

    @Synchronized
    fun addFacility(facility: Facility) {
        facilities.add(facility)
    }

    @Synchronized
    fun addCheckpoint(checkpoint: Checkpoint) {
        if (!checkpoints.any { it.blockId == checkpoint.blockId && it.floorId == checkpoint.floorId && it.checkpointId.equals(checkpoint.checkpointId, ignoreCase = true) }) {
            checkpoints.add(checkpoint)
        }
    }

    @Synchronized
    fun addNavigationNode(node: NavigationNode) {
        if (!navigationNodes.any { it.id == node.id }) {
            navigationNodes.add(node)
        }
    }

    @Synchronized
    fun deleteNavigationNode(id: String) {
        navigationNodes.removeAll { it.id == id }
    }

    @Synchronized
    fun getAllNavigationNodes(): List<NavigationNode> = navigationNodes.toList()

    @Synchronized
    fun getNavigationNode(id: String): NavigationNode? = navigationNodes.find { it.id == id }

    @Synchronized
    fun addNavigationEdge(edge: NavigationEdge) {
        if (!navigationEdges.any { it.id == edge.id }) {
            navigationEdges.add(edge)
        }
    }

    @Synchronized
    fun updateNavigationEdge(edge: NavigationEdge) {
        val idx = navigationEdges.indexOfFirst { it.id == edge.id }
        if (idx != -1) {
            navigationEdges[idx] = edge
        }
    }

    @Synchronized
    fun deleteNavigationEdge(id: String) {
        navigationEdges.removeAll { it.id == id }
    }

    @Synchronized
    fun getNavigationEdges(): List<NavigationEdge> = navigationEdges.toList()

    @Synchronized
    fun getNavigationGraph(): NavigationGraph {
        return NavigationGraph(navigationNodes.toList(), navigationEdges.toList())
    }

    @Synchronized
    fun addCalibrationPoint(point: CalibrationPoint) {
        calibrationPoints.add(point)
    }

    @Synchronized
    fun updateRoom(room: Room) {
        val idx = rooms.indexOfFirst { it.id == room.id }
        if (idx != -1) {
            rooms[idx] = room
        }
    }

    @Synchronized
    fun updateFacility(facility: Facility) {
        val idx = facilities.indexOfFirst { it.id == facility.id }
        if (idx != -1) {
            facilities[idx] = facility
        }
    }

    @Synchronized
    fun updateCheckpoint(checkpoint: Checkpoint) {
        val idx = checkpoints.indexOfFirst { it.id == checkpoint.id }
        if (idx != -1) {
            checkpoints[idx] = checkpoint
        }
    }

    @Synchronized
    fun deleteRoom(id: String) {
        rooms.removeAll { it.id == id }
        wifiFingerprints.removeAll { it.locationId == id }
    }

    @Synchronized
    fun deleteFacility(id: String) {
        facilities.removeAll { it.id == id }
        wifiFingerprints.removeAll { it.locationId == id }
    }

    @Synchronized
    fun deleteCheckpoint(id: String) {
        checkpoints.removeAll { it.id == id }
        wifiFingerprints.removeAll { it.locationId == id }
    }

    @Synchronized
    fun deleteCalibrationPoint(id: String) {
        calibrationPoints.removeAll { it.id == id }
    }

    @Synchronized
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

    @Synchronized
    fun getCalibrationPoints(blockId: String, floorId: String): List<CalibrationPoint> {
        return calibrationPoints.filter { it.blockId == blockId && it.floorId == floorId }
    }

    // Wi-Fi Fingerprint methods
    @Synchronized
    fun saveWifiFingerprint(fingerprint: WifiFingerprint) {
        wifiFingerprints.removeAll { it.locationId == fingerprint.locationId }
        wifiFingerprints.add(fingerprint)
    }

    @Synchronized
    fun getWifiFingerprint(locationId: String): WifiFingerprint? {
        return wifiFingerprints.find { it.locationId == locationId }
    }

    @Synchronized
    fun getAllWifiFingerprints(): List<WifiFingerprint> = wifiFingerprints.toList()

    @Synchronized
    fun deleteWifiFingerprint(locationId: String) {
        wifiFingerprints.removeAll { it.locationId == locationId }
    }

    @Synchronized
    fun hasWifiFingerprint(locationId: String): Boolean {
        return wifiFingerprints.any { it.locationId == locationId }
    }
    
    // Phase 10 Enhancement Methods
    
    @Synchronized
    fun searchSections(query: String): List<Section> {
        if (query.isBlank()) return emptyList()
        return sections.filter { it.name.contains(query, ignoreCase = true) }
    }
    
    @Synchronized
    fun getSection(id: String): Section? = sections.find { it.id == id }
    
    @Synchronized
    fun addSection(section: Section) {
        if (!sections.any { it.id == section.id }) {
            sections.add(section)
        }
    }

    @Synchronized
    fun getClassSchedules(sectionId: String, day: String): List<ClassSchedule> {
        return classSchedules.filter { it.sectionId == sectionId && it.day.equals(day, ignoreCase = true) }
    }
    
    @Synchronized
    fun searchSubjects(query: String): List<ClassSchedule> {
        if (query.isBlank()) return emptyList()
        return classSchedules.filter { it.subject.contains(query, ignoreCase = true) }
    }
    
    @Synchronized
    fun addClassSchedule(schedule: ClassSchedule) {
        classSchedules.add(schedule)
    }
    
    @Synchronized
    fun addFeedback(feedback: Feedback) {
        feedbacks.add(feedback)
    }
    
    @Synchronized
    fun getAllFeedbacks(): List<Feedback> = feedbacks.toList()
}
