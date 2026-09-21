package com.example.ibnips;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Backend response from GET /api/map — contains the full floor graph.
 */
public class MapResponse {

    public List<MapNode> nodes;
    public List<MapEdge> edges;
    public Map<String, List<WifiScanResult>> fingerprints;

    public MapResponse() {
        nodes = new ArrayList<>();
        edges = new ArrayList<>();
        fingerprints = new HashMap<>();
    }

    /**
     * Deserialise from the backend map response JSON.
     *
     * Expected shape:
     * {
     *   "nodes": [{"node_id":"...", "name":"...", "floor":2, "x":100, "y":200}, ...],
     *   "edges": [{"from_node":"...", "to_node":"...", "steps":10, "direction":"N"}, ...]
     * }
     */
    public static MapResponse fromJSON(JSONObject obj) throws JSONException {
        MapResponse response = new MapResponse();

        JSONArray nodesArr = obj.optJSONArray("nodes");
        if (nodesArr != null) {
            for (int i = 0; i < nodesArr.length(); i++) {
                JSONObject n = nodesArr.getJSONObject(i);
                MapNode node = new MapNode();
                node.nodeId = n.optString("node_id", "");
                node.name   = n.optString("name", "");
                node.floor  = n.optInt("floor", 0);
                node.x      = n.optInt("x", 0);
                node.y      = n.optInt("y", 0);
                response.nodes.add(node);
            }
        }

        JSONArray edgesArr = obj.optJSONArray("edges");
        if (edgesArr != null) {
            for (int i = 0; i < edgesArr.length(); i++) {
                JSONObject e = edgesArr.getJSONObject(i);
                MapEdge edge = new MapEdge();
                edge.fromNode  = e.optString("from_node", "");
                edge.toNode    = e.optString("to_node", "");
                edge.steps     = e.optInt("steps", 0);
                edge.direction = e.optString("direction", "");
                response.edges.add(edge);
            }
        }

        JSONObject fpsObj = obj.optJSONObject("fingerprints");
        if (fpsObj != null) {
            for (java.util.Iterator<String> it = fpsObj.keys(); it.hasNext(); ) {
                String nodeId = it.next();
                JSONArray fpArr = fpsObj.optJSONArray(nodeId);
                if (fpArr != null) {
                    List<WifiScanResult> list = new ArrayList<>();
                    for (int i = 0; i < fpArr.length(); i++) {
                        list.add(WifiScanResult.fromJSON(fpArr.getJSONObject(i)));
                    }
                    response.fingerprints.put(nodeId, list);
                }
            }
        }

        return response;
    }

    /**
     * Convert fingerprints from map.json into TaggedLocation objects
     * for local matching. Needs the nodes list to get name/floor.
     */
    public List<TaggedLocation> toTaggedLocations() {
        List<TaggedLocation> result = new ArrayList<>();
        for (MapNode node : nodes) {
            List<WifiScanResult> fp = fingerprints.get(node.nodeId);
            if (fp != null && !fp.isEmpty()) {
                result.add(new TaggedLocation(node.name, node.floor, node.nodeId, fp));
            }
        }
        return result;
    }
}
