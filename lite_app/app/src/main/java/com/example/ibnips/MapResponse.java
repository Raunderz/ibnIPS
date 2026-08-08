package com.example.ibnips;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Backend response from GET /api/map — contains the full floor graph.
 */
public class MapResponse {

    public List<MapNode> nodes;
    public List<MapEdge> edges;

    public MapResponse() {
        nodes = new ArrayList<>();
        edges = new ArrayList<>();
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

        return response;
    }
}
