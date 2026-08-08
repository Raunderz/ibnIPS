package com.example.ibnips;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Localisation result — the backend's best guess at the user's position.
 */
public class PositionResponse {

    public int    x;
    public int    y;
    public int    floor;
    public String nodeId;
    public String name;

    public PositionResponse(int x, int y, int floor, String nodeId, String name) {
        this.x      = x;
        this.y      = y;
        this.floor  = floor;
        this.nodeId = nodeId != null ? nodeId : "";
        this.name   = name != null ? name : "";
    }

    /**
     * Deserialise from backend JSON:
     * {"x":100, "y":200, "floor":2, "node_id":"lab_201_f2", "name":"Lab 201"}
     * or {"x":100, "y":200, "floor":2}
     */
    public static PositionResponse fromJSON(JSONObject obj) throws JSONException {
        int x     = obj.optInt("x", -1);
        int y     = obj.optInt("y", -1);
        int floor = obj.optInt("floor", -1);

        String nodeId = obj.optString("node_id", obj.optString("nodeId", ""));
        String name   = obj.optString("name", obj.optString("node_name", ""));

        return new PositionResponse(x, y, floor, nodeId, name);
    }

    @Override
    public String toString() {
        return "PositionResponse{x=" + x + ", y=" + y + ", floor=" + floor +
                ", nodeId='" + nodeId + "', name='" + name + "'}";
    }
}
