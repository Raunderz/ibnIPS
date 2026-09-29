package com.ibnips.app.data.network

import com.google.gson.annotations.SerializedName

data class AuthRequest(
    @SerializedName("email") val email: String
)

data class AuthResponse(
    @SerializedName("token") val token: String,
    @SerializedName("user_id") val userId: String
)

data class PingFingerprint(
    @SerializedName("bssid") val bssid: String,
    @SerializedName("ssid") val ssid: String,
    @SerializedName("rssi") val rssi: Int
)

data class PingRequest(
    @SerializedName("name") val name: String,
    @SerializedName("floor") val floor: Int,
    @SerializedName("previous_node_id") val previousNodeId: String,
    @SerializedName("steps") val steps: Int,
    @SerializedName("direction") val direction: String,
    @SerializedName("fingerprints") val fingerprints: List<PingFingerprint>
)

data class PingResponse(
    @SerializedName("status") val status: String,
    @SerializedName("node_id") val nodeId: String
)

data class NodeNetworkDto(
    @SerializedName("node_id") val nodeId: String,
    @SerializedName("name") val name: String,
    @SerializedName("floor") val floor: Int,
    @SerializedName("x") val x: Int,
    @SerializedName("y") val y: Int
)

data class EdgeNetworkDto(
    @SerializedName("from_node") val fromNode: String,
    @SerializedName("to_node") val toNode: String,
    @SerializedName("steps") val steps: Int,
    @SerializedName("direction") val direction: String
)

data class MapResponse(
    @SerializedName("nodes") val nodes: List<NodeNetworkDto>,
    @SerializedName("edges") val edges: List<EdgeNetworkDto>
)

data class ErrorResponse(
    @SerializedName("error") val error: String,
    @SerializedName("details") val details: String
)
