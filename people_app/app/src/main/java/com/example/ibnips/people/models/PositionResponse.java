package com.example.ibnips.people.models;

/**
 * Model representing a localized position result.
 */
public class PositionResponse {
    public int x;
    public int y;
    public int floor;
    public String nearestNodeId;
    public String nearestNodeName;
    public int matchedSignals;
    public boolean success;
    public String message;

    public PositionResponse() {}

    public PositionResponse(int x, int y, int floor, String nodeId, String nodeName, int matchedSignals) {
        this.x = x;
        this.y = y;
        this.floor = floor;
        this.nearestNodeId = nodeId;
        this.nearestNodeName = nodeName;
        this.matchedSignals = matchedSignals;
        this.success = true;
        this.message = "OK";
    }

    public static PositionResponse failed(String message) {
        PositionResponse r = new PositionResponse();
        r.success = false;
        r.message = message;
        return r;
    }
}
