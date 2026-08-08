package com.example.ibnips;

/**
 * An edge connecting two nodes on the floor map.
 */
public class MapEdge {
    public String fromNode;
    public String toNode;
    public int    steps;
    public String direction; // e.g. "N", "SE"
}
