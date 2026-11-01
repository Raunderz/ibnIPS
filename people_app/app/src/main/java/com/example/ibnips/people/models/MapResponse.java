package com.example.ibnips.people.models;

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

    public List<MapNode> nodes   = new ArrayList<>();
    public List<MapEdge> edges   = new ArrayList<>();
    /** node_id -> list of Wi-Fi fingerprints for that node (for locate-me). */
    public Map<String, List<WifiScanResult>> fingerprints = new HashMap<>();

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
}
