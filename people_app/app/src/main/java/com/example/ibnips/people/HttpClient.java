package com.example.ibnips.people;

import android.util.Log;

import com.example.ibnips.people.models.FeedbackResponse;
import com.example.ibnips.people.models.MapResponse;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * HTTP client for the people app (read-only).
 *
 * Base URL: https://ibnips.onrender.com
 *
 * All network calls are synchronous — callers must invoke from a background
 * thread. Auth header is sent only when a token is present; the backend
 * accepts requests without one while auth is OFF.
 */
public class HttpClient {

    private static final String TAG   = "ibnIPS-People-HTTP";
    private static final String BASE_URL = "https://ibnips.onrender.com";
    private static final int    TIMEOUT  = 8000; // ms

    private String lastError = "";
    private int    lastStatus = 0;

    public String getLastError() { return lastError; }
    public int getLastStatus() { return lastStatus; }

    /** Fetch the full floor graph. Auth optional. */
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

    /** Fetch feedback (public endpoint). Never sends a token. */
    public FeedbackResponse getFeedback() {
        try {
            JSONObject response = get("/api/feedback?limit=500", null);
            if (response == null) return null;
            lastError = "";
            return FeedbackResponse.fromJSON(response);
        } catch (Exception e) {
            Log.e(TAG, "getFeedback failed", e);
            lastError = "could not read feedback: " + e;
            return null;
        }
    }

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
            lastStatus = status;
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
            lastStatus = 0;
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

    private String explainError(String body) {
        if (body == null || body.isEmpty()) return "no reason given";
        try {
            JSONObject json = new JSONObject(body);
            String code    = json.optString("error", "");
            String details = json.optString("details", "");
            if (!details.isEmpty()) return code.isEmpty() ? details : code + " — " + details;
            if (!code.isEmpty()) return code;
        } catch (Exception ignored) {}
        return body.length() > 200 ? body.substring(0, 200) + "…" : body;
    }
}
