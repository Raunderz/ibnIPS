package com.example.ibnips;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Localisation result — the backend's best guess at the user's position.
 *
 * <p>Returned by POST /api/position. The backend scores every tagged room
 * against the current scan and answers with the best one, so {@link #confidence}
 * says how much that answer is worth: the app treats anything under 30% as no
 * answer at all and falls back to its local match.
 */
public class PositionResponse {

    /** Confidence at or above which the backend call is trusted. */
    public static final int MIN_CONFIDENCE = 30;

    public int    x;
    public int    y;
    public int    floor;
    public String nodeId;
    public String name;
    public int    confidence;
    public String confidenceLevel;
    /** How many tagged readings the answer is based on — i.e. how many times
     *  that room has been walked. Low next to a high confidence means the room
     *  matched well but needs more walks. */
    public int    samples;

    public PositionResponse(int x, int y, int floor, String nodeId, String name,
                            int confidence, String confidenceLevel, int samples) {
        this.x      = x;
        this.y      = y;
        this.floor  = floor;
        this.nodeId = nodeId != null ? nodeId : "";
        this.name   = name != null ? name : "";
        this.confidence = Math.min(100, Math.max(0, confidence));
        this.confidenceLevel = confidenceLevel != null ? confidenceLevel : "";
        this.samples = samples;
    }

    /**
     * Deserialise from backend JSON:
     * {"x":100, "y":200, "floor":2, "node_id":"lab_201_f2", "name":"Lab 201",
     *  "confidence":88, "confidence_level":"High", "samples":20}
     *
     * <p>confidence/confidence_level/samples are optional so an older backend
     * that omits them still parses — such a response reads as 0% and is
     * rejected.
     */
    public static PositionResponse fromJSON(JSONObject obj) throws JSONException {
        int x     = obj.optInt("x", -1);
        int y     = obj.optInt("y", -1);
        int floor = obj.optInt("floor", -1);

        String nodeId = obj.optString("node_id", obj.optString("nodeId", ""));
        String name   = obj.optString("name", obj.optString("node_name", ""));

        int confidence = obj.optInt("confidence", 0);
        String level   = obj.optString("confidence_level",
                                       obj.optString("confidenceLevel", ""));
        int samples    = obj.optInt("samples", 0);

        return new PositionResponse(x, y, floor, nodeId, name, confidence, level, samples);
    }

    /** Whether this answer is specific enough to act on. */
    public boolean isConfident() {
        return !name.isEmpty() && confidence >= MIN_CONFIDENCE;
    }

    @Override
    public String toString() {
        return "PositionResponse{x=" + x + ", y=" + y + ", floor=" + floor +
                ", nodeId='" + nodeId + "', name='" + name + "', confidence=" +
                confidence + "%, samples=" + samples + "}";
    }
}
