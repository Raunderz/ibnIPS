package com.example.ibnips;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.List;

/**
 * Main (and only) activity.
 *
 * Layout: MapView fills the screen; a bottom overlay panel holds control buttons
 * and status text. All network calls run on a background thread; UI updates are
 * posted back to the main thread.
 */
public class MainActivity extends Activity {

    private static final String TAG         = "ibnIPS";
    private static final int    PERM_REQ    = 1001;
    private static final int    SCAN_DELAY  = 2500; // ms before reading scan results

    // ------------------------------------------------------------------
    // Views (wired up in onCreate)
    // ------------------------------------------------------------------
    private MapView   mapView;
    private TextView  statusText;
    private EditText  roomNameInput;
    private Spinner   floorSpinner;
    private Button    scanButton;
    private Button    pingButton;
    private Button    fetchMapButton;

    // ------------------------------------------------------------------
    // App state
    // ------------------------------------------------------------------
    private final HttpBackendClient backendClient = new HttpBackendClient();
    private List<WifiScanResult>    lastScanResults = new ArrayList<>();
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

        // Floor spinner: floors 1–5
        String[] floors = {"Floor 1", "Floor 2", "Floor 3", "Floor 4", "Floor 5"};
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this,
                android.R.layout.simple_spinner_item, floors);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        floorSpinner.setAdapter(adapter);

        // Request runtime permissions
        WifiScanner.requestLocationPermissions(this, PERM_REQ);

        // Wire buttons
        scanButton.setOnClickListener(v -> onScanClicked());
        pingButton.setOnClickListener(v -> onPingClicked());
        fetchMapButton.setOnClickListener(v -> onFetchMapClicked());

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
        // Refresh status label on resume
        if (authToken != null) {
            setStatus("Ready", false);
        }
    }

    // ------------------------------------------------------------------
    // Button handlers
    // ------------------------------------------------------------------

    private void onScanClicked() {
        setStatus("Starting Wi-Fi scan…", false);
        boolean started = WifiScanner.startScan(this);
        if (!started) {
            setStatus("Scan failed — check permissions / Wi-Fi enabled", true);
            return;
        }

        // Read results after OS scan completes (~2s)
        mainHandler.postDelayed(() -> {
            lastScanResults = WifiScanner.getLastScanResults(this);
            int count = lastScanResults.size();
            setStatus("Scanned: " + count + " network" + (count == 1 ? "" : "s"), false);
            Log.d(TAG, "Scan results: " + lastScanResults);
        }, SCAN_DELAY);
    }

    private void onPingClicked() {
        String roomName = roomNameInput.getText().toString().trim();
        if (roomName.isEmpty()) {
            setStatus("Enter a room name first", true);
            return;
        }
        if (authToken == null) {
            setStatus("Not authenticated — wait or restart", true);
            return;
        }

        int floor = floorSpinner.getSelectedItemPosition() + 1; // 1-indexed

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
                    setStatus("Pinged: " + nodeId, false);
                } else {
                    setStatus("Ping failed — see logcat", true);
                }
            });
        });
    }

    private void onFetchMapClicked() {
        if (authToken == null) {
            setStatus("Not authenticated — wait or restart", true);
            return;
        }

        setStatus("Fetching map…", false);
        runInBackground(() -> {
            MapResponse map = backendClient.getMap(authToken);
            mainHandler.post(() -> {
                if (map != null) {
                    mapView.setMapData(map);
                    int nodeCount = map.nodes != null ? map.nodes.size() : 0;
                    int edgeCount = map.edges != null ? map.edges.size() : 0;
                    setStatus("Map loaded: " + nodeCount + " nodes, " + edgeCount + " edges", false);
                } else {
                    setStatus("Map fetch failed — see logcat", true);
                }
            });
        });
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

    /** Display a status message. If error=true, tint red and auto-clear after 3s. */
    private void setStatus(String msg, boolean error) {
        statusText.setText(msg);
        statusText.setTextColor(error
                ? Color.parseColor("#D32F2F")
                : Color.parseColor("#212121"));
        Log.d(TAG, "Status: " + msg);

        if (error) {
            mainHandler.postDelayed(() -> {
                if (statusText.getCurrentTextColor() == Color.parseColor("#D32F2F")) {
                    statusText.setTextColor(Color.parseColor("#212121"));
                }
            }, 3000);
        }
    }

    /** Run a Runnable on a new daemon thread (fire-and-forget). */
    private void runInBackground(Runnable task) {
        Thread t = new Thread(task);
        t.setDaemon(true);
        t.start();
    }
}
