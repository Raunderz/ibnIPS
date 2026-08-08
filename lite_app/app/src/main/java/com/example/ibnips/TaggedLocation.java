package com.example.ibnips;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Model representing a tagged location stored locally on the device,
 * with signal similarity and confidence calculation.
 */
public class TaggedLocation {

    public String name;
    public int floor;
    public String nodeId;
    public List<WifiScanResult> fingerprints;

    public TaggedLocation(String name, int floor, String nodeId, List<WifiScanResult> fingerprints) {
        this.name = name != null ? name : "";
        this.floor = floor;
        this.nodeId = nodeId != null ? nodeId : "";
        this.fingerprints = fingerprints != null ? fingerprints : new ArrayList<>();
    }

    public static class MatchResult {
        public TaggedLocation location;
        public double score;
        public int matchCount;
        public int confidencePct;
        public String confidenceLevel; // "High", "Medium", "Low", "Uncertain"

        public MatchResult(TaggedLocation location, double score, int matchCount, int confidencePct) {
            this.location = location;
            this.score = score;
            this.matchCount = matchCount;
            this.confidencePct = Math.min(100, Math.max(0, confidencePct));

            if (this.confidencePct >= 75) {
                this.confidenceLevel = "High";
            } else if (this.confidencePct >= 50) {
                this.confidenceLevel = "Medium";
            } else if (this.confidencePct >= 30) {
                this.confidenceLevel = "Low";
            } else {
                this.confidenceLevel = "Uncertain";
            }
        }
    }

    /**
     * Compute detailed match statistics & confidence between current Wi-Fi scan and this location.
     */
    public MatchResult computeMatchResult(List<WifiScanResult> currentScans) {
        if (fingerprints.isEmpty() || currentScans == null || currentScans.isEmpty()) {
            return new MatchResult(this, 0.0, 0, 0);
        }

        double totalRssiDiff = 0.0;
        int matchCount = 0;

        for (WifiScanResult current : currentScans) {
            for (WifiScanResult tagged : fingerprints) {
                if (current.bssid.equalsIgnoreCase(tagged.bssid)) {
                    int diff = Math.abs(current.rssi - tagged.rssi);
                    totalRssiDiff += diff;
                    matchCount++;
                    break;
                }
            }
        }

        if (matchCount == 0) {
            return new MatchResult(this, 0.0, 0, 0);
        }

        double avgDiff = totalRssiDiff / matchCount;
        double baseScore = (100.0 - avgDiff) * matchCount;

        // Calculate confidence percentage
        int confidencePct;
        if (matchCount >= 3) {
            confidencePct = (int) Math.round(Math.max(20.0, 95.0 - (avgDiff * 2.0)));
        } else if (matchCount == 2) {
            confidencePct = (int) Math.round(Math.max(15.0, 85.0 - (avgDiff * 2.5)));
        } else { // 1 matching BSSID
            confidencePct = (int) Math.round(Math.max(10.0, 60.0 - (avgDiff * 3.0)));
        }

        return new MatchResult(this, baseScore, matchCount, confidencePct);
    }

    public JSONObject toJSON() throws JSONException {
        JSONObject obj = new JSONObject();
        obj.put("name", name);
        obj.put("floor", floor);
        obj.put("node_id", nodeId);

        JSONArray arr = new JSONArray();
        for (WifiScanResult scan : fingerprints) {
            arr.put(scan.toJSON());
        }
        obj.put("fingerprints", arr);
        return obj;
    }

    public static TaggedLocation fromJSON(JSONObject obj) throws JSONException {
        String name = obj.optString("name", "");
        int floor = obj.optInt("floor", 1);
        String nodeId = obj.optString("node_id", "");

        List<WifiScanResult> list = new ArrayList<>();
        JSONArray arr = obj.optJSONArray("fingerprints");
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                list.add(WifiScanResult.fromJSON(arr.getJSONObject(i)));
            }
        }
        return new TaggedLocation(name, floor, nodeId, list);
    }
}
