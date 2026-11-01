package com.example.ibnips.people;

import com.example.ibnips.people.models.MapEdge;
import com.example.ibnips.people.models.MapNode;
import com.example.ibnips.people.models.MapResponse;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.Set;

/**
 * A* pathfinder over the floor graph.
 *
 * Nodes carry (x, y) coordinates; edges connect pairs of nodes with a step
 * count. Heuristic is straight-line distance, so A* expands far fewer nodes
 * than Dijkstra while still guaranteeing the shortest path (all edge weights
 * are positive).
 *
 * Returns the ordered list of node ids from start to end, or an empty list
 * when no route exists (or start == end).
 */
public class Router {

    /** One step along the route. */
    public static class Step {
        public final String nodeId;
        public final String name;
        public final int floor;
        public final int x;
        public final int y;
        public final String fromDirection; // direction used to arrive here, "" for first

        Step(String nodeId, String name, int floor, int x, int y, String fromDirection) {
            this.nodeId = nodeId;
            this.name = name;
            this.floor = floor;
            this.x = x;
            this.y = y;
            this.fromDirection = fromDirection;
        }
    }

    private final MapResponse map;
    private final Map<String, MapNode> nodeById = new HashMap<>();
    private final Map<String, List<MapEdge>> adj = new HashMap<>();

    public Router(MapResponse map) {
        this.map = map;
        if (map.nodes != null) {
            for (MapNode n : map.nodes) nodeById.put(n.nodeId, n);
        }
        if (map.edges != null) {
            for (MapEdge e : map.edges) {
                adj.computeIfAbsent(e.fromNode, k -> new ArrayList<>()).add(e);
                // Undirected graph: walking works both ways
                MapEdge reverse = new MapEdge();
                reverse.fromNode = e.toNode;
                reverse.toNode   = e.fromNode;
                reverse.steps    = e.steps;
                reverse.direction = invert(e.direction);
                adj.computeIfAbsent(e.toNode, k -> new ArrayList<>()).add(reverse);
            }
        }
    }

    private static String invert(String d) {
        if (d == null || d.isEmpty()) return "";
        switch (d) {
            case "N": return "S";
            case "S": return "N";
            case "E": return "W";
            case "W": return "E";
            case "NE": return "SW";
            case "SW": return "NE";
            case "SE": return "NW";
            case "NW": return "SE";
            default: return d;
        }
    }

    /** Find the node closest to (x, y), useful for snapping "from"/"to" taps. */
    public String nearestNode(int x, int y) {
        String best = null;
        long bestDist = Long.MAX_VALUE;
        for (MapNode n : map.nodes) {
            long dx = n.x - x, dy = n.y - y;
            long d = dx * dx + dy * dy;
            if (d < bestDist) { bestDist = d; best = n.nodeId; }
        }
        return best;
    }

    /**
     * Route from startNodeId to endNodeId.
     *
     * @return ordered list of Step, or empty list if no path.
     */
    public List<Step> findRoute(String startNodeId, String endNodeId) {
        if (startNodeId == null || endNodeId == null
                || startNodeId.isEmpty() || endNodeId.isEmpty()
                || !nodeById.containsKey(startNodeId) || !nodeById.containsKey(endNodeId)) {
            return Collections.emptyList();
        }
        if (startNodeId.equals(endNodeId)) {
            MapNode n = nodeById.get(startNodeId);
            return Collections.singletonList(new Step(n.nodeId, n.name, n.floor, n.x, n.y, ""));
        }

        // A*
        Map<String, Double> gScore = new HashMap<>();
        Map<String, String> cameFrom = new HashMap<>();
        Map<String, String> cameFromDir = new HashMap<>();

        PriorityQueue<OpenNode> open = new PriorityQueue<>((a, b) -> Double.compare(a.f, b.f));
        Set<String> closed = new HashSet<>();

        gScore.put(startNodeId, 0.0);
        open.add(new OpenNode(startNodeId, heuristic(startNodeId, endNodeId)));

        while (!open.isEmpty()) {
            OpenNode cur = open.poll();
            String current = cur.nodeId;
            if (closed.contains(current)) continue;
            if (current.equals(endNodeId)) break;
            closed.add(current);

            MapNode curNode = nodeById.get(current);
            double curG = gScore.getOrDefault(current, Double.MAX_VALUE);

            for (MapEdge edge : adj.getOrDefault(current, Collections.emptyList())) {
                String neighbor = edge.toNode;
                if (closed.contains(neighbor)) continue;
                double tentativeG = curG + edgeWeight(edge);
                double neighG = gScore.getOrDefault(neighbor, Double.MAX_VALUE);
                if (tentativeG < neighG) {
                    cameFrom.put(neighbor, current);
                    cameFromDir.put(neighbor, edge.direction);
                    gScore.put(neighbor, tentativeG);
                    open.add(new OpenNode(neighbor, tentativeG + heuristic(neighbor, endNodeId)));
                }
            }
        }

        if (!cameFrom.containsKey(endNodeId)) return Collections.emptyList();

        // Reconstruct path
        List<Step> path = new ArrayList<>();
        String at = endNodeId;
        while (true) {
            MapNode n = nodeById.get(at);
            String dir = cameFromDir.getOrDefault(at, "");
            path.add(new Step(n.nodeId, n.name, n.floor, n.x, n.y, dir));
            if (at.equals(startNodeId)) break;
            at = cameFrom.get(at);
        }
        Collections.reverse(path);
        // First step has no arrival direction
        if (!path.isEmpty()) {
            Step first = path.get(0);
            path.set(0, new Step(first.nodeId, first.name, first.floor, first.x, first.y, ""));
        }
        return path;
    }

    private double heuristic(String a, String b) {
        MapNode na = nodeById.get(a);
        MapNode nb = nodeById.get(b);
        if (na == null || nb == null) return 0;
        double dx = na.x - nb.x;
        double dy = na.y - nb.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private double edgeWeight(MapEdge e) {
        // Prefer fewer steps; fall back to coordinate distance if steps is 0
        if (e.steps > 0) return e.steps;
        MapNode f = nodeById.get(e.fromNode);
        MapNode t = nodeById.get(e.toNode);
        if (f == null || t == null) return 1;
        double dx = f.x - t.x, dy = f.y - t.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private static class OpenNode {
        final String nodeId;
        final double f;
        OpenNode(String nodeId, double f) { this.nodeId = nodeId; this.f = f; }
    }
}
