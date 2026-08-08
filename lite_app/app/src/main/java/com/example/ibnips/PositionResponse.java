package com.example.ibnips;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Localisation result — the backend's best guess at the user's position.
 */
public class PositionResponse {

    public int x;
    public int y;
    public int floor;

    public PositionResponse(int x, int y, int floor) {
        this.x     = x;
        this.y     = y;
        this.floor = floor;
    }

    /**
     * Deserialise from backend JSON: {"x":100,"y":200,"floor":2}
     */
    public static PositionResponse fromJSON(JSONObject obj) throws JSONException {
        int x     = obj.getInt("x");
        int y     = obj.getInt("y");
        int floor = obj.getInt("floor");
        return new PositionResponse(x, y, floor);
    }

    @Override
    public String toString() {
        return "PositionResponse{x=" + x + ", y=" + y + ", floor=" + floor + '}';
    }
}
