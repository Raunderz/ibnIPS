package com.ibnips.app.data.network

import com.google.gson.annotations.SerializedName

data class AuthRequest(
    @SerializedName("email") val email: String,
    // The shared AUTH_KEY from the server's environment. The backend rejects
    // every login that does not carry it, and rejects a server with no key
    // configured rather than handing tokens to whoever asks.
    @SerializedName("access_key") val accessKey: String
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

// What the app sends to ask where it is: the current Wi-Fi scan, and nothing
// else. The server holds the tagged side of the comparison.
data class PositionRequest(
    @SerializedName("fingerprints") val fingerprints: List<PingFingerprint>
)

// The room the server believes the caller is in.
//
// `x`/`y` are the matched node's map coordinates and are 0 until the room has
// been placed on the map, so a client that cannot use coordinates should key off
// `nodeId` instead. `confidence` is 0-100, `confidenceLevel` is the server's own
// tier ("High"/"Medium"/"Low"/"Uncertain"), and `samples` is how many tagged
// readings back the answer — a low `samples` beside a high `confidence` means the
// room matched well but has barely been visited.
data class PositionResultDto(
    @SerializedName("node_id") val nodeId: String,
    @SerializedName("name") val name: String,
    @SerializedName("floor") val floor: Int,
    @SerializedName("x") val x: Int,
    @SerializedName("y") val y: Int,
    @SerializedName("confidence") val confidence: Int,
    @SerializedName("confidence_level") val confidenceLevel: String,
    @SerializedName("samples") val samples: Int
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
