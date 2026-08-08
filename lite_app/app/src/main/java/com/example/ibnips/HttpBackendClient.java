package com.example.ibnips;

import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Handles all HTTP communication with the ibnIPS Gleam backend.
 *
 * Base URL: http://localhost:3000
 *
 * Note: all network calls are synchronous — callers must invoke from a
 * background thread (e.g. via AsyncTask or Thread).
 */
public class HttpBackendClient {

    private static final String TAG      = "ibnIPS-HTTP";
    private static final String BASE_URL = "http://localhost:3000";
    private static final int    TIMEOUT  = 8000; // ms

    // ------------------------------------------------------------------
    // authenticate — POST /api/auth → returns bearer token
    // ------------------------------------------------------------------

    /**
     * @param email e.g. "user@iitb.ac.in"
     * @return token string, or null on failure
     */
    public String authenticate(String email) {
        try {
            JSONObject body = new JSONObject();
            body.put("email", email);

            JSONObject response = post("/api/auth", null, body);
            if (response == null) return null;

            return response.getString("token");
        } catch (Exception e) {
            Log.e(TAG, "authenticate failed", e);
            return null;
        }
    }

    // ------------------------------------------------------------------
    // ping — POST /api/ping → returns node_id
    // ------------------------------------------------------------------

    /**
     * Tags or updates a room with Wi-Fi fingerprints.
     *
     * @param token          bearer token from authenticate()
     * @param nodeName       human-readable room name, e.g. "Lab 201"
     * @param floor          floor number (1-indexed)
     * @param previousNodeId node_id of the last known node ("" if unknown)
     * @param steps          steps walked since last node (-1 if unknown)
     * @param direction      8-way direction ("N","NE",… or "" if unknown)
     * @param wifiScans      current Wi-Fi fingerprints
     * @return node_id string, or null on failure
     */
    public String ping(String token,
                       String nodeName,
                       int floor,
                       String previousNodeId,
                       int steps,
                       String direction,
                       List<WifiScanResult> wifiScans) {
        try {
            JSONArray fingerprints = new JSONArray();
            for (WifiScanResult scan : wifiScans) {
                fingerprints.put(scan.toJSON());
            }

            JSONObject body = new JSONObject();
            body.put("name",             nodeName);
            body.put("floor",            floor);
            body.put("previous_node_id", previousNodeId != null ? previousNodeId : "");
            body.put("steps",            steps);
            body.put("direction",        direction != null ? direction : "");
            body.put("fingerprints",     fingerprints);

            JSONObject response = post("/api/ping", token, body);
            if (response == null) return null;

            return response.getString("node_id");
        } catch (Exception e) {
            Log.e(TAG, "ping failed", e);
            return null;
        }
    }

    // ------------------------------------------------------------------
    // getMap — GET /api/map → returns MapResponse
    // ------------------------------------------------------------------

    /**
     * Fetches the full floor graph from the backend.
     *
     * @param token bearer token
     * @return MapResponse, or null on failure
     */
    public MapResponse getMap(String token) {
        try {
            JSONObject response = get("/api/map", token);
            if (response == null) return null;
            return MapResponse.fromJSON(response);
        } catch (Exception e) {
            Log.e(TAG, "getMap failed", e);
            return null;
        }
    }

    // ------------------------------------------------------------------
    // fetchPosition — POST /api/position (reserved for future use)
    // ------------------------------------------------------------------

    /**
     * Asks the backend to localise the user based on current fingerprints.
     * Not wired up in the UI yet.
     *
     * @param token     bearer token
     * @param wifiScans current scan results
     * @return PositionResponse, or null on failure
     */
    public PositionResponse fetchPosition(String token, List<WifiScanResult> wifiScans) {
        try {
            JSONArray fingerprints = new JSONArray();
            for (WifiScanResult scan : wifiScans) {
                fingerprints.put(scan.toJSON());
            }

            JSONObject body = new JSONObject();
            body.put("fingerprints", fingerprints);

            JSONObject response = post("/api/position", token, body);
            if (response == null) return null;

            return PositionResponse.fromJSON(response);
        } catch (Exception e) {
            Log.e(TAG, "fetchPosition failed", e);
            return null;
        }
    }

    // ------------------------------------------------------------------
    // Low-level helpers
    // ------------------------------------------------------------------

    /** POST helper — body must be a JSONObject. Returns parsed response body. */
    private JSONObject post(String path, String token, JSONObject body) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(BASE_URL + path);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(TIMEOUT);
            conn.setReadTimeout(TIMEOUT);
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            conn.setRequestProperty("Accept", "application/json");

            if (token != null && !token.isEmpty()) {
                conn.setRequestProperty("Authorization", "Bearer " + token);
            }

            byte[] bodyBytes = body.toString().getBytes(StandardCharsets.UTF_8);
            conn.setFixedLengthStreamingMode(bodyBytes.length);

            try (OutputStream os = conn.getOutputStream()) {
                os.write(bodyBytes);
            }

            int status = conn.getResponseCode();
            if (status < 200 || status >= 300) {
                Log.e(TAG, "POST " + path + " returned HTTP " + status);
                logErrorBody(conn);
                return null;
            }

            return readBody(conn);
        } catch (Exception e) {
            Log.e(TAG, "POST " + path + " exception", e);
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    /** GET helper — token optional. Returns parsed response body. */
    private JSONObject get(String path, String token) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(BASE_URL + path);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(TIMEOUT);
            conn.setReadTimeout(TIMEOUT);
            conn.setRequestProperty("Accept", "application/json");

            if (token != null && !token.isEmpty()) {
                conn.setRequestProperty("Authorization", "Bearer " + token);
            }

            int status = conn.getResponseCode();
            if (status < 200 || status >= 300) {
                Log.e(TAG, "GET " + path + " returned HTTP " + status);
                logErrorBody(conn);
                return null;
            }

            return readBody(conn);
        } catch (Exception e) {
            Log.e(TAG, "GET " + path + " exception", e);
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private JSONObject readBody(HttpURLConnection conn) throws Exception {
        StringBuilder sb = new StringBuilder();
        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = br.readLine()) != null) {
                sb.append(line);
            }
        }
        return new JSONObject(sb.toString());
    }

    private void logErrorBody(HttpURLConnection conn) {
        try {
            if (conn.getErrorStream() != null) {
                StringBuilder sb = new StringBuilder();
                try (BufferedReader br = new BufferedReader(
                        new InputStreamReader(conn.getErrorStream(), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = br.readLine()) != null) sb.append(line);
                }
                Log.e(TAG, "Error body: " + sb);
            }
        } catch (Exception ignored) { /* best-effort */ }
    }
}
