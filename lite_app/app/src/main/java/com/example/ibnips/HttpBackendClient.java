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
    private static final String BASE_URL = "https://ibnips.onrender.com";
    private static final int    TIMEOUT  = 8000; // ms

    /**
     * Why the most recent call failed, in words meant for a human.
     *
     * Every request here returns null on failure, which on its own tells the
     * user nothing — a wrong key, an unreachable server and a rejected body all
     * look the same. This keeps the reason for the last failure so the UI can
     * show it instead of a generic message.
     */
    private String lastError = "";

    /** The reason the most recent call failed, or "" if it succeeded. */
    public String getLastError() {
        return lastError;
    }

    /** Pull the human-readable part out of the server's error body. */
    private String explainError(String body) {
        if (body == null || body.isEmpty()) return "no reason given";
        // The API answers errors as {"error":"code","details":"message"}.
        // Prefer the message; fall back to showing the body if it isn't JSON.
        try {
            JSONObject json = new JSONObject(body);
            String code    = json.optString("error", "");
            String details = json.optString("details", "");
            if (!details.isEmpty()) {
                return code.isEmpty() ? details : code + " — " + details;
            }
            if (!code.isEmpty()) return code;
        } catch (Exception ignored) {
            // Not JSON (an HTML error page, say) — show it as-is below.
        }
        return body.length() > 200 ? body.substring(0, 200) + "…" : body;
    }

    // ------------------------------------------------------------------
    // authenticate — POST /api/auth → returns bearer token
    // ------------------------------------------------------------------

    /**
     * Exchanges an email and the shared access key for a bearer token.
     *
     * @param email    e.g. "user@kiit.ac.in"
     * @param accessKey the shared secret configured as AUTH_KEY on the server
     * @return token string, or null on failure
     */
    public String authenticate(String email, String accessKey) {
        try {
            JSONObject body = new JSONObject();
            body.put("email", email);
            body.put("access_key", accessKey);

            JSONObject response = post("/api/auth", null, body);
            if (response == null) return null;

            if (!response.has("token")) {
                lastError = "server replied 200 but sent no token";
                return null;
            }
            lastError = "";
            return response.getString("token");
        } catch (Exception e) {
            Log.e(TAG, "authenticate failed", e);
            lastError = "could not read the reply: " + e;
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

            if (!response.has("node_id")) {
                lastError = "server accepted the ping but sent no node_id";
                return null;
            }
            lastError = "";
            return response.getString("node_id");
        } catch (Exception e) {
            Log.e(TAG, "ping failed", e);
            lastError = "could not read the reply: " + e;
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
            lastError = "";
            return MapResponse.fromJSON(response);
        } catch (Exception e) {
            Log.e(TAG, "getMap failed", e);
            lastError = "could not read the map: " + e;
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

            lastError = "";
            return PositionResponse.fromJSON(response);
        } catch (Exception e) {
            Log.e(TAG, "fetchPosition failed", e);
            lastError = "could not read the reply: " + e;
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
                String errorBody = readErrorBody(conn);
                Log.e(TAG, "POST " + path + " returned HTTP " + status + " " + errorBody);
                lastError = "HTTP " + status + " — " + explainError(errorBody);
                return null;
            }

            lastError = "";
            return readBody(conn);
        } catch (Exception e) {
            Log.e(TAG, "POST " + path + " exception", e);
            lastError = "no reply from " + BASE_URL + " (" + e + ")";
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
                String errorBody = readErrorBody(conn);
                Log.e(TAG, "GET " + path + " returned HTTP " + status + " " + errorBody);
                lastError = "HTTP " + status + " — " + explainError(errorBody);
                return null;
            }

            lastError = "";
            return readBody(conn);
        } catch (Exception e) {
            Log.e(TAG, "GET " + path + " exception", e);
            lastError = "no reply from " + BASE_URL + " (" + e + ")";
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

    /**
     * Read the error body the server sent back, or "" if there wasn't one.
     *
     * The backend answers errors as JSON with a human-readable "details"
     * field, so this is usually worth showing rather than discarding.
     */
    private String readErrorBody(HttpURLConnection conn) {
        try {
            if (conn.getErrorStream() == null) return "";
            StringBuilder sb = new StringBuilder();
            try (BufferedReader br = new BufferedReader(
                    new InputStreamReader(conn.getErrorStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = br.readLine()) != null) sb.append(line);
            }
            return sb.toString().trim();
        } catch (Exception ignored) {
            return "";
        }
    }
}
