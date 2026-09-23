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

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------
    private MapView   mapView;
    private TextView  statusText;
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

        // Load persistent tagged locations
        loadTaggedLocations();

        // Authenticate in background on startup
        setStatus("Authenticating…", false);
        runInBackground(() -> {
            String token = backendClient.authenticate("user@iitb.ac.in");
            mainHandler.post(() -> {
                if (token != null) {
                    authToken = token;
                    setStatus("Ready", false);
                } else {
                    setStatus("Auth failed — check backend", true);
                }
            });
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (authToken != null) {
            setStatus("Ready", false);
        }
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

        if (authToken == null) {
            setStatus("Tagged locally: " + roomName + " (Auth pending)", false);
            return;
        }

        setStatus("Pinging backend…", false);
        runInBackground(() -> {
            String nodeId = backendClient.ping(
                    authToken,
                    roomName,
                    floor,
                    "",     // no previous node
                    -1,     // steps unknown
                    "",     // direction unknown
                    lastScanResults
            );
            mainHandler.post(() -> {
                if (nodeId != null) {
                    setStatus("Pinged & Saved: " + roomName + " (" + lastScanResults.size() + " APs)", false);
                    Toast.makeText(MainActivity.this, "Tagged location '" + roomName + "' with " + lastScanResults.size() + " Wi-Fi signals", Toast.LENGTH_SHORT).show();
                } else {
                    setStatus("Ping failed on server — saved locally (" + roomName + ")", true);
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
                    setStatus("Map fetch failed — see logcat", true);
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
                // Check backend or local result
                if (finalBackendPos != null && !isEmptyStr(finalBackendPos.name)) {
                    String locName = resolveLocationName(finalBackendPos);
                    setStatus("Current location of you is: " + locName, false);
                    Toast.makeText(MainActivity.this, "Current location of you is: " + locName, Toast.LENGTH_LONG).show();
                    if (finalBackendPos.x >= 0 && finalBackendPos.y >= 0) {
                        mapView.setUserPositionAnimated(finalBackendPos.x, finalBackendPos.y, finalBackendPos.floor);
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
