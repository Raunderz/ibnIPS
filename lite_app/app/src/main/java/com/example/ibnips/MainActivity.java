package com.example.ibnips;

import android.app.Activity;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.view.animation.OvershootInterpolator;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;

import java.util.ArrayList;
import java.util.List;

/**
 * Main activity for ibnIPS app.
 */
public class MainActivity extends Activity {

    private static final String TAG           = "ibnIPS";
    private static final int    PERM_REQ      = 1001;
    private static final int    SCAN_DELAY    = 2500; // ms before reading scan results
    private static final String PREF_TAGGED   = "tagged_locations_json";
    private static final String PREF_ACCESS_KEY = "access_key";
    /** The email whose account the app logs in as. */
    private static final String AUTH_EMAIL    = "user@kiit.ac.in";
    /** Visits of a room below which the app suggests more tagging. Matches the
     *  backend's WELL_MAPPED_READINGS. */
    private static final int    WELL_MAPPED_SAMPLES = 10;

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------
    private MapView   mapView;
    private TextView  statusText;
    private EditText  accessKeyInput;
    private EditText  roomNameInput;
    private Spinner   floorSpinner;
    private Button    scanButton;
    private Button    pingButton;
    private Button    fetchMapButton;
    private Button    locateMeButton;

    // ------------------------------------------------------------------
    // App state
    // ------------------------------------------------------------------
    private final HttpBackendClient backendClient = new HttpBackendClient();
    private List<WifiScanResult>    lastScanResults = new ArrayList<>();
    private List<TaggedLocation>    localTaggedLocations = new ArrayList<>();
    private MapResponse             cachedMapData   = null;
    private String                  authToken       = null;
    /** Why the last login attempt failed, or "" if it has not been tried. */
    private String                  lastAuthError   = "";
    /** The key we last sent, so we don't send it twice for no reason. */
    private String                  lastTriedKey    = "";

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    // ------------------------------------------------------------------
    // Lifecycle
    // ------------------------------------------------------------------

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.main);

        // Bind views
        mapView        = findViewById(R.id.mapView);
        statusText     = findViewById(R.id.statusText);
        accessKeyInput = findViewById(R.id.accessKeyInput);
        roomNameInput  = findViewById(R.id.roomNameInput);
        floorSpinner   = findViewById(R.id.floorSpinner);
        scanButton     = findViewById(R.id.btnScan);
        pingButton     = findViewById(R.id.btnPing);
        fetchMapButton = findViewById(R.id.btnFetchMap);
        locateMeButton = findViewById(R.id.btnLocateMe);

        // Floor spinner: floors 1–5
        String[] floors = {"Floor 1", "Floor 2", "Floor 3", "Floor 4", "Floor 5"};
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this,
                android.R.layout.simple_spinner_item, floors);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        floorSpinner.setAdapter(adapter);

        // Request runtime permissions
        WifiScanner.requestLocationPermissions(this, PERM_REQ);

        // Wire buttons
        scanButton.setOnClickListener(v -> { animatePress(v); onScanClicked(); });
        pingButton.setOnClickListener(v -> { animatePress(v); onPingClicked(); });
        fetchMapButton.setOnClickListener(v -> { animatePress(v); onFetchMapClicked(); });
        locateMeButton.setOnClickListener(v -> { animatePress(v); onLocateMeClicked(); });

        // Pressing the key field re-authenticates, so a corrected key takes
        // effect without restarting the app.
        accessKeyInput.setOnEditorActionListener((v, actionId, event) -> {
            authenticateInBackground();
            return true;
        });

        // Leaving the key field also re-authenticates. Without this, typing a
        // key and tapping straight to PING never sent it — the keyboard's Done
        // key was the only thing that triggered a login, so the request went
        // out unauthenticated and the status said "Auth pending".
        accessKeyInput.setOnFocusChangeListener((v, hasFocus) -> {
            if (!hasFocus) authenticateInBackground();
        });

        // Load persistent tagged locations
        loadTaggedLocations();

        // Restore the saved access key and log in if there is one.
        accessKeyInput.setText(loadAccessKey());
        if (loadAccessKey().isEmpty()) {
            setStatus("Enter the access key to connect", true);
        } else {
            authenticateInBackground();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (authToken != null) {
            setStatus("Ready", false);
        }
    }

    // ------------------------------------------------------------------
    // Authentication
    // ------------------------------------------------------------------

    /**
     * Exchange the access key for a bearer token, off the UI thread.
     *
     * Saves the key so the user only types it once, then retries.
     */
    private void authenticateInBackground() {
        final String key = accessKeyInput.getText().toString().trim();

        if (key.isEmpty()) {
            authToken = null;
            lastAuthError = "";
            setStatus("Enter the access key to connect", true);
            return;
        }

        // Pressing Done also closes the keyboard, which fires the focus
        // listener. Skip the repeat when this exact key already got us a token.
        if (key.equals(lastTriedKey) && authToken != null) return;

        lastTriedKey = key;
        setStatus("Authenticating…", false);
        runInBackground(() -> {
            String token = backendClient.authenticate(AUTH_EMAIL, key);
            mainHandler.post(() -> {
                if (token != null) {
                    authToken = token;
                    lastAuthError = "";
                    saveAccessKey(key);
                    setStatus("Ready", false);
                } else {
                    // Say what the server actually said. "Wrong access key" was
                    // all we used to show, which is indistinguishable from an
                    // unreachable server or a rejected body.
                    authToken = null;
                    lastAuthError = backendClient.getLastError();
                    setStatus("Auth failed: " + lastAuthError, true);
                    Toast.makeText(MainActivity.this,
                            "Login refused: " + lastAuthError, Toast.LENGTH_LONG).show();
                }
            });
        });
    }

    private void saveAccessKey(String key) {
        SharedPreferences prefs = getSharedPreferences("ibnIPS_prefs", MODE_PRIVATE);
        prefs.edit().putString(PREF_ACCESS_KEY, key).apply();
    }

    private String loadAccessKey() {
        SharedPreferences prefs = getSharedPreferences("ibnIPS_prefs", MODE_PRIVATE);
        return prefs.getString(PREF_ACCESS_KEY, "");
    }

    // ------------------------------------------------------------------
    // Button handlers
    // ------------------------------------------------------------------

    private void onScanClicked() {
        if (!WifiScanner.isLocationEnabled(this)) {
            setStatus("Turn ON Location (GPS) in phone settings", true);
            Toast.makeText(this, "Android requires Location (GPS) to be ON for Wi-Fi scanning", Toast.LENGTH_LONG).show();
            return;
        }

        setStatus("Scanning Wi-Fi…", false);
        boolean started = WifiScanner.startScan(this);
        Log.d(TAG, "startScan returned: " + started);

        mainHandler.postDelayed(() -> {
            lastScanResults = WifiScanner.getFreshScanResults(this, 12000);
            int count = lastScanResults.size();
            if (count > 0) {
                setStatus("Scanned: " + count + " network" + (count == 1 ? "" : "s"), false);
            } else {
                setStatus("0 networks found — check Wi-Fi & Location permissions", true);
            }
            Log.d(TAG, "Scan results count: " + count);
        }, started ? SCAN_DELAY : 500);
    }

    private void onPingClicked() {
        String roomName = roomNameInput.getText().toString().trim();
        if (roomName.isEmpty()) {
            setStatus("Enter a room name first", true);
            return;
        }

        // Get fresh scan results
        lastScanResults = WifiScanner.getFreshScanResults(this, 15000);

        if (lastScanResults.isEmpty()) {
            setStatus("No Wi-Fi networks scanned! Click SCAN first.", true);
            Toast.makeText(this, "Click SCAN first to record Wi-Fi fingerprints before tagging!", Toast.LENGTH_LONG).show();
            return;
        }

        int floor = floorSpinner.getSelectedItemPosition() + 1; // 1-indexed

        // Store locally immediately so matching works 100%
        saveTaggedLocation(roomName, floor, roomName.toLowerCase().replace(" ", "_"), lastScanResults);

        // No early check for a token here. If there isn't one, the login below
        // gets one first — bailing out at this point is what made the first tap
        // after typing a key only save on the phone.
        setStatus("Pinging backend…", false);
        runInBackground(() -> {
            // Log in here if we have a key but no token yet. Tapping PING
            // straight after typing the key lost the race against the login
            // started by the focus listener, so the ping went out with no
            // token and the room was only saved on the phone.
            String key = accessKeyInput.getText().toString().trim();
            String token = authToken;
            if (token == null && !key.isEmpty()) {
                token = backendClient.authenticate(AUTH_EMAIL, key);
            }

            if (token == null) {
                String error = backendClient.getLastError();
                final String why = error.isEmpty() ? "no access key entered" : error;
                mainHandler.post(() -> setStatus(
                        "Saved on phone only — not sent to server (" + why + ")", true));
                return;
            }

            final String bearer = token;
            String nodeId = backendClient.ping(
                    bearer,
                    roomName,
                    floor,
                    "",     // no previous node
                    -1,     // steps unknown
                    "",     // direction unknown
                    lastScanResults
            );
            mainHandler.post(() -> {
                if (nodeId != null) {
                    // Keep the token so the next ping doesn't log in again.
                    authToken = bearer;
                    lastAuthError = "";
                    if (!key.isEmpty()) saveAccessKey(key);
                    setStatus("Pinged & Saved: " + roomName + " (" + lastScanResults.size() + " APs)", false);
                    Toast.makeText(MainActivity.this, "Tagged location '" + roomName + "' with " + lastScanResults.size() + " Wi-Fi signals", Toast.LENGTH_SHORT).show();
                } else {
                    authToken = null;
                    lastAuthError = backendClient.getLastError();
                    setStatus("Ping rejected: " + lastAuthError, true);
                }
            });
        });
    }

    private void onFetchMapClicked() {
        setStatus("Fetching map…", false);
        runInBackground(() -> {
            MapResponse map = backendClient.getMap(authToken);
            mainHandler.post(() -> {
                if (map != null) {
                    cachedMapData = map;
                    mapView.setMapData(map);

                    // Load fingerprints from map.json into local tagged locations
                    List<TaggedLocation> fromMap = map.toTaggedLocations();
                    if (!fromMap.isEmpty()) {
                        for (TaggedLocation tag : fromMap) {
                            boolean exists = false;
                            for (TaggedLocation existing : localTaggedLocations) {
                                if (existing.nodeId.equals(tag.nodeId)) {
                                    exists = true;
                                    break;
                                }
                            }
                            if (!exists) {
                                localTaggedLocations.add(tag);
                            }
                        }
                        // Persist merged list
                        try {
                            SharedPreferences prefs = getSharedPreferences("ibnIPS_prefs", MODE_PRIVATE);
                            JSONArray arr = new JSONArray();
                            for (TaggedLocation t : localTaggedLocations) {
                                arr.put(t.toJSON());
                            }
                            prefs.edit().putString(PREF_TAGGED, arr.toString()).apply();
                        } catch (Exception e) {
                            Log.e(TAG, "Failed to persist map fingerprints", e);
                        }
                        Log.d(TAG, "Loaded " + fromMap.size() + " locations from map.json (" + localTaggedLocations.size() + " total)");
                    }

                    int nodeCount = map.nodes != null ? map.nodes.size() : 0;
                    int edgeCount = map.edges != null ? map.edges.size() : 0;
                    int fpCount = map.fingerprints != null ? map.fingerprints.size() : 0;
                    setStatus("Map loaded: " + nodeCount + " nodes, " + edgeCount + " edges, " + fpCount + " tagged", false);
                } else {
                    setStatus("Map fetch failed: " + backendClient.getLastError(), true);
                }
            });
        });
    }

    /**
     * "Locate Me" button click handler.
     */
    private void onLocateMeClicked() {
        if (!WifiScanner.isLocationEnabled(this)) {
            setStatus("Turn ON Location (GPS) in phone settings", true);
            Toast.makeText(this, "Android requires Location (GPS) to be ON for Wi-Fi scanning", Toast.LENGTH_LONG).show();
            return;
        }

        setStatus("Refreshing Wi-Fi scan for location…", false);
        WifiScanner.startScan(this);

        // Stage 1: Wait 2s for hardware scan to complete
        mainHandler.postDelayed(() -> {
            lastScanResults = WifiScanner.getFreshScanResults(this, 8000);

            if (lastScanResults.isEmpty()) {
                setStatus("Waiting for hardware scan sweep…", false);
                mainHandler.postDelayed(() -> performLocationMatching(), 1500);
            } else {
                performLocationMatching();
            }
        }, 2000);
    }

    private void performLocationMatching() {
        lastScanResults = WifiScanner.getLastScanResults(this);

        if (lastScanResults.isEmpty()) {
            setStatus("No Wi-Fi networks found to locate", true);
            return;
        }

        setStatus("Matching Wi-Fi fingerprints… (" + lastScanResults.size() + " APs)", false);
        runInBackground(() -> {
            PositionResponse backendPos = null;

            // 1. Attempt backend position lookup if authenticated
            if (authToken != null) {
                try {
                    backendPos = backendClient.fetchPosition(authToken, lastScanResults);
                } catch (Exception e) {
                    Log.w(TAG, "Backend positioning failed, using local match", e);
                }
            }

            // 2. Local fingerprint match with confidence evaluation
            TaggedLocation.MatchResult localMatch = findBestLocalMatch(lastScanResults);

            final PositionResponse finalBackendPos = backendPos;
            mainHandler.post(() -> {
                // Backend answer first, but only if it is confident enough to
                // be worth more than the local match.
                if (finalBackendPos != null && finalBackendPos.isConfident()) {
                    String locName = resolveLocationName(finalBackendPos);
                    String statusMsg = "Current location of you is: " + locName
                            + " (" + finalBackendPos.confidenceLevel
                            + " confidence — " + finalBackendPos.confidence + "%)";
                    // Say when the room matches well but is barely mapped, so
                    // the user knows more walks would make it better.
                    if (finalBackendPos.confidence >= 75
                            && finalBackendPos.samples < WELL_MAPPED_SAMPLES) {
                        statusMsg += " — only seen " + finalBackendPos.samples
                                + " time(s), keep tagging this room";
                    }
                    setStatus(statusMsg, finalBackendPos.confidence < 75);
                    Toast.makeText(MainActivity.this, statusMsg, Toast.LENGTH_LONG).show();

                    // The server's x/y come straight from the nodes table, which
                    // holds 0,0 until a room is placed on the map. Prefer the
                    // coordinates from the map we already fetched.
                    int[] coords = resolveMapCoords(finalBackendPos);
                    if (coords != null) {
                        mapView.setUserPositionAnimated(coords[0], coords[1], finalBackendPos.floor);
                    }
                    return;
                }

                // If no backend result, evaluate local match confidence
                if (localMatch == null || localMatch.confidencePct < 30) {
                    setStatus("Location uncertain — weak Wi-Fi match. Try re-tagging with Ping.", true);
                    Toast.makeText(MainActivity.this, "Location uncertain (weak Wi-Fi signal match). Re-tag this room with Ping.", Toast.LENGTH_LONG).show();
                    return;
                }

                TaggedLocation loc = localMatch.location;
                if (loc == null || isEmptyStr(loc.name)) {
                    setStatus("Location uncertain — no matching tagged room.", true);
                    return;
                }

                // Format honest confidence level for the user
                String statusMsg;
                if (localMatch.confidencePct >= 75) {
                    statusMsg = "Current location of you is: " + loc.name + " (High confidence — " + localMatch.confidencePct + "%)";
                } else if (localMatch.confidencePct >= 50) {
                    statusMsg = "Likely location: " + loc.name + " (Medium confidence — " + localMatch.confidencePct + "%)";
                } else {
                    statusMsg = "Low confidence: Possibly near " + loc.name + " (" + localMatch.confidencePct + "% match)";
                }

                setStatus(statusMsg, localMatch.confidencePct < 50);
                Toast.makeText(MainActivity.this, statusMsg, Toast.LENGTH_LONG).show();
            });
        });
    }

    // ------------------------------------------------------------------
    // Local Fingerprint Matching & Storage
    // ------------------------------------------------------------------

    private TaggedLocation.MatchResult findBestLocalMatch(List<WifiScanResult> currentScans) {
        if (localTaggedLocations.isEmpty() || currentScans == null || currentScans.isEmpty()) {
            return null;
        }

        TaggedLocation.MatchResult bestMatch = null;

        for (TaggedLocation tagged : localTaggedLocations) {
            TaggedLocation.MatchResult result = tagged.computeMatchResult(currentScans);
            Log.d(TAG, "Match result for '" + tagged.name + "': score=" + result.score + ", matchCount=" + result.matchCount + ", conf=" + result.confidencePct + "%");

            if (bestMatch == null || result.score > bestMatch.score) {
                bestMatch = result;
            }
        }

        return bestMatch;
    }

    private void saveTaggedLocation(String name, int floor, String nodeId, List<WifiScanResult> scans) {
        // Remove existing duplicate by name
        for (int i = localTaggedLocations.size() - 1; i >= 0; i--) {
            if (localTaggedLocations.get(i).name.equalsIgnoreCase(name)) {
                localTaggedLocations.remove(i);
            }
        }

        // Add new tagged location
        TaggedLocation newTag = new TaggedLocation(name, floor, nodeId, new ArrayList<>(scans));
        localTaggedLocations.add(newTag);

        // Persist to SharedPreferences
        try {
            SharedPreferences prefs = getSharedPreferences("ibnIPS_prefs", MODE_PRIVATE);
            JSONArray arr = new JSONArray();
            for (TaggedLocation tag : localTaggedLocations) {
                arr.put(tag.toJSON());
            }
            prefs.edit().putString(PREF_TAGGED, arr.toString()).apply();
            Log.d(TAG, "Saved tagged location '" + name + "' to SharedPreferences (" + localTaggedLocations.size() + " total)");
        } catch (Exception e) {
            Log.e(TAG, "Failed to save tagged locations to SharedPreferences", e);
        }
    }

    private void loadTaggedLocations() {
        localTaggedLocations.clear();
        try {
            SharedPreferences prefs = getSharedPreferences("ibnIPS_prefs", MODE_PRIVATE);
            String jsonStr = prefs.getString(PREF_TAGGED, null);
            if (jsonStr != null && !jsonStr.isEmpty()) {
                JSONArray arr = new JSONArray(jsonStr);
                for (int i = 0; i < arr.length(); i++) {
                    localTaggedLocations.add(TaggedLocation.fromJSON(arr.getJSONObject(i)));
                }
                Log.d(TAG, "Loaded " + localTaggedLocations.size() + " tagged locations from SharedPreferences");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to load tagged locations", e);
        }
    }

    private String resolveLocationName(PositionResponse pos) {
        if (!isEmptyStr(pos.name)) {
            return pos.name;
        }
        if (!isEmptyStr(pos.nodeId)) {
            if (cachedMapData != null && cachedMapData.nodes != null) {
                for (MapNode node : cachedMapData.nodes) {
                    if (node.nodeId != null && node.nodeId.equals(pos.nodeId)) {
                        if (!isEmptyStr(node.name)) return node.name;
                    }
                }
            }
            return pos.nodeId;
        }
        if (pos.x >= 0 && pos.y >= 0 && cachedMapData != null && cachedMapData.nodes != null) {
            MapNode closest = null;
            long minDistanceSq = Long.MAX_VALUE;
            for (MapNode node : cachedMapData.nodes) {
                long dx = node.x - pos.x;
                long dy = node.y - pos.y;
                long distSq = dx * dx + dy * dy;
                if (distSq < minDistanceSq) {
                    minDistanceSq = distSq;
                    closest = node;
                }
            }
            if (closest != null) {
                return !isEmptyStr(closest.name) ? closest.name : closest.nodeId;
            }
        }
        return "Unknown";
    }

    /**
     * Map coordinates for a backend answer, preferring the map already fetched
     * from GET /api/map over the x/y the server sent.
     *
     * <p>The server reads x/y from the nodes table, which stays 0,0 until a
     * room is placed on the map — only map.json has real coordinates. So look
     * the node up by id first, and only fall back to the server's own numbers
     * when the cached map does not know this room.
     *
     * @return {x, y}, or null if there is nowhere sensible to draw the dot
     */
    private int[] resolveMapCoords(PositionResponse pos) {
        if (cachedMapData != null && cachedMapData.nodes != null) {
            for (MapNode node : cachedMapData.nodes) {
                if (node.nodeId != null && node.nodeId.equals(pos.nodeId)) {
                    return new int[]{node.x, node.y};
                }
            }
        }
        if (pos.x >= 0 && pos.y >= 0) {
            return new int[]{pos.x, pos.y};
        }
        return null;
    }

    private boolean isEmptyStr(String str) {
        return str == null || str.trim().isEmpty();
    }

    // ------------------------------------------------------------------
    // Permission result
    // ------------------------------------------------------------------

    @Override
    public void onRequestPermissionsResult(int requestCode,
                                           String[] permissions,
                                           int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERM_REQ) {
            boolean allGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }
            if (!allGranted) {
                Toast.makeText(this,
                        "Location permission required for Wi-Fi scanning",
                        Toast.LENGTH_LONG).show();
                setStatus("Missing permissions — Wi-Fi scan disabled", true);
            }
        }
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private void setStatus(String msg, boolean error) {
        if (msg == null || msg.equals(statusText.getText().toString())) return;

        statusText.setText(msg);
        statusText.setTextColor(error
                ? Color.parseColor("#D32F2F")
                : Color.parseColor("#212121"));
        Log.d(TAG, "Status: " + msg);

        // Fade-in animation
        statusText.setAlpha(0.3f);
        statusText.animate().alpha(1.0f).setDuration(250).start();

        if (error) {
            mainHandler.postDelayed(() -> {
                if (statusText.getCurrentTextColor() == Color.parseColor("#D32F2F")) {
                    statusText.setTextColor(Color.parseColor("#212121"));
                }
            }, 4000);
        }
    }

    private void animatePress(View v) {
        v.animate()
            .scaleX(0.94f)
            .scaleY(0.94f)
            .setDuration(100)
            .withEndAction(() -> {
                v.animate()
                    .scaleX(1.0f)
                    .scaleY(1.0f)
                    .setDuration(300)
                    .setInterpolator(new OvershootInterpolator())
                    .start();
            })
            .start();
    }

    private void runInBackground(Runnable task) {
        Thread t = new Thread(task);
        t.setDaemon(true);
        t.start();
    }
}
