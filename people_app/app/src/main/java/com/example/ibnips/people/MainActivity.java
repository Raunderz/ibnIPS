package com.example.ibnips.people;

import android.app.Activity;
import android.app.Dialog;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.OvershootInterpolator;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import com.example.ibnips.people.models.FeedbackItem;
import com.example.ibnips.people.models.FeedbackResponse;
import com.example.ibnips.people.models.MapEdge;
import com.example.ibnips.people.models.MapNode;
import com.example.ibnips.people.models.MapResponse;
import com.example.ibnips.people.models.WifiScanResult;
import com.example.ibnips.people.Router;

import org.json.JSONArray;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * People app: read-only indoor map, reviews, locate-me, and to/from routing.
 *
 * Bottom nav with three tabs:
 *   Map   — live floor plan, user dot, locate-me
 *   Reviews — feedback list from GET /api/feedback
 *   Route — from/to pickers + A* route drawn on the map
 *
 * No login required. Auth header is sent only if a token happens to exist.
 */
public class MainActivity extends Activity {

    private static final String TAG = "ibnIPS-People";
    private static final String PREF_LAST_FROM = "last_from_node";
    private static final String PREF_LAST_TO   = "last_to_node";

    // ---- Views ----
    private MapView     mapView;
    private TextView    statusText;
    private Button      btnLocate;
    private Button      btnRoute;
    // bottom nav
    private Button      navMap, navReviews, navRoute;
    // panels
    private LinearLayout panelMap, panelReviews, panelRoute;
    private ScrollView  reviewsScroll;
    private LinearLayout reviewsList;
    private Spinner     spinnerFrom, spinnerTo;
    private TextView    routeSummary;

    // ---- State ----
    private final HttpClient http = new HttpClient();
    private MapResponse mapData;
    private final List<MapNode> nodes = new ArrayList<>();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private int tab = 0; // 0=map, 1=reviews, 2=route

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.main);

        mapView      = findViewById(R.id.mapView);
        statusText   = findViewById(R.id.statusText);
        btnLocate    = findViewById(R.id.btnLocate);
        btnRoute     = findViewById(R.id.btnRoute);

        navMap       = findViewById(R.id.navMap);
        navReviews   = findViewById(R.id.navReviews);
        navRoute     = findViewById(R.id.navRoute);

        panelMap     = findViewById(R.id.panelMap);
        panelReviews = findViewById(R.id.panelReviews);
        panelRoute   = findViewById(R.id.panelRoute);
        reviewsScroll= findViewById(R.id.reviewsScroll);
        reviewsList  = findViewById(R.id.reviewsList);
        spinnerFrom  = findViewById(R.id.spinnerFrom);
        spinnerTo    = findViewById(R.id.spinnerTo);
        routeSummary = findViewById(R.id.routeSummary);

        // Bottom nav
        navMap.setOnClickListener(v -> setTab(0));
        navReviews.setOnClickListener(v -> setTab(1));
        navRoute.setOnClickListener(v -> setTab(2));

        // Locate me
        btnLocate.setOnClickListener(v -> onLocateClicked());

        // Route
        btnRoute.setOnClickListener(v -> onRouteClicked());

        // Permissions + data
        WifiScanner.requestLocationPermissions(this);
        loadMap();
        loadReviews();

        setTab(0);
    }

    // ------------------------------------------------------------------
    // Tabs
    // ------------------------------------------------------------------

    private void setTab(int t) {
        tab = t;
        navMap.setSelected(t == 0);
        navReviews.setSelected(t == 1);
        navRoute.setSelected(t == 2);

        panelMap.setVisibility(t == 0 ? View.VISIBLE : View.GONE);
        panelReviews.setVisibility(t == 1 ? View.VISIBLE : View.GONE);
        panelRoute.setVisibility(t == 2 ? View.VISIBLE : View.GONE);

        if (t == 1) refreshReviewsUI();
        if (t == 2) refreshRouteSpinners();
    }

    // ------------------------------------------------------------------
    // Map
    // ------------------------------------------------------------------

    private void loadMap() {
        setStatus("Fetching map…", false);
        runInBackground(() -> {
            MapResponse data = http.getMap(null);
            final String err = http.getLastError();
            mainHandler.post(() -> {
                if (data == null) {
                    setStatus("Map load failed: " + err, true);
                    return;
                }
                mapData = data;
                nodes.clear();
                if (data.nodes != null) nodes.addAll(data.nodes);
                mapView.setMapData(data);
                refreshRouteSpinners();
                int n = data.nodes != null ? data.nodes.size() : 0;
                int e = data.edges != null ? data.edges.size() : 0;
                setStatus("Map loaded — " + n + " rooms, " + e + " paths", false);
            });
        });
    }

    private void onLocateClicked() {
        if (!WifiScanner.isReady(this)) {
            setStatus("Turn ON Wi-Fi & Location", true);
            Toast.makeText(this, "Enable Wi-Fi and Location to locate yourself", Toast.LENGTH_LONG).show();
            return;
        }
        setStatus("Scanning Wi-Fi…", false);
        WifiScanner.startScan(this);
        mainHandler.postDelayed(() -> {
            List<WifiScanResult> scans = WifiScanner.getResults(this);
            if (scans.isEmpty()) {
                setStatus("No Wi-Fi networks found", true);
                return;
            }
            // Local fingerprint match against map fingerprints
            Router router = new Router(mapData);
            MapNode best = null;
            int bestScore = 0;
            for (MapNode node : nodes) {
                List<WifiScanResult> fp = mapData.fingerprints.get(node.nodeId);
                if (fp == null || fp.isEmpty()) continue;
                int score = matchCount(scans, fp);
                if (score > bestScore) { bestScore = score; best = node; }
            }
            final MapNode b = best;
            final int bestS = bestScore;
            mainHandler.post(() -> {
                if (b == null || bestS < 1) {
                    setStatus("Location uncertain — weak match", true);
                    return;
                }
                mapView.setUserPosition(b.x, b.y, b.floor);
                setStatus("You are near " + b.name + " (" + bestS + " signals)", false);
                Toast.makeText(MainActivity.this, "Near " + b.name, Toast.LENGTH_SHORT).show();
            });
        }, 2500);
    }

    private int matchCount(List<WifiScanResult> a, List<WifiScanResult> b) {
        int count = 0;
        for (WifiScanResult x : a) {
            for (WifiScanResult y : b) {
                if (x.bssid.equalsIgnoreCase(y.bssid)) { count++; break; }
            }
        }
        return count;
    }

    // ------------------------------------------------------------------
    // Reviews
    // ------------------------------------------------------------------

    private void loadReviews() {
        runInBackground(() -> {
            FeedbackResponse data = http.getFeedback();
            final String err = http.getLastError();
            mainHandler.post(() -> {
                if (data == null) {
                    // still show empty state gracefully
                    renderReviews(new ArrayList<>(), 0);
                    return;
                }
                renderReviews(data.items, data.total);
            });
        });
    }

    private void refreshReviewsUI() {
        // Re-render in case data arrived after tab switch
        renderReviews(currentReviewItems, currentReviewTotal);
    }

    // cached so refresh can re-render
    private List<FeedbackItem> currentReviewItems = new ArrayList<>();
    private int currentReviewTotal = 0;

    private void renderReviews(List<FeedbackItem> items, int total) {
        currentReviewItems = items;
        currentReviewTotal = total;
        reviewsList.removeAllViews();
        LayoutInflater inf = LayoutInflater.from(this);
        if (items.isEmpty()) {
            TextView empty = new TextView(this);
            empty.setText("No reviews yet.");
            empty.setTextColor(Color.parseColor("#9E9E9E"));
            empty.setTextSize(14f);
            empty.setPadding(16, 16, 16, 16);
            reviewsList.addView(empty);
            return;
        }
        for (FeedbackItem item : items) {
            View row = inf.inflate(R.layout.item_review, reviewsList, false);
            TextView username = row.findViewById(R.id.reviewUsername);
            TextView stars    = row.findViewById(R.id.reviewStars);
            TextView comment  = row.findViewById(R.id.reviewComment);
            username.setText(item.username);
            stars.setText(item.stars());
            stars.setVisibility(item.stars().isEmpty() ? View.GONE : View.VISIBLE);
            comment.setText(item.comment.isEmpty() ? "—" : item.comment);
            reviewsList.addView(row);
        }
    }

    // ------------------------------------------------------------------
    // Route (to/from)
    // ------------------------------------------------------------------

    private void refreshRouteSpinners() {
        List<String> names = new ArrayList<>();
        for (MapNode n : nodes) names.add(n.name);
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this,
                android.R.layout.simple_spinner_item, names);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerFrom.setAdapter(adapter);
        spinnerTo.setAdapter(adapter);

        // Restore last selection
        SharedPreferences prefs = getSharedPreferences("people_prefs", MODE_PRIVATE);
        String lastFrom = prefs.getString(PREF_LAST_FROM, null);
        String lastTo   = prefs.getString(PREF_LAST_TO, null);
        if (lastFrom != null) {
            int i = indexOfNodeName(lastFrom);
            if (i >= 0) spinnerFrom.setSelection(i);
        }
        if (lastTo != null) {
            int i = indexOfNodeName(lastTo);
            if (i >= 0) spinnerTo.setSelection(i);
        }
    }

    private int indexOfNodeName(String name) {
        for (int i = 0; i < nodes.size(); i++)
            if (nodes.get(i).name != null && nodes.get(i).name.equals(name)) return i;
        return -1;
    }

    private void onRouteClicked() {
        int fi = spinnerFrom.getSelectedItemPosition();
        int ti = spinnerTo.getSelectedItemPosition();
        if (fi < 0 || ti < 0 || fi >= nodes.size() || ti >= nodes.size()) {
            setStatus("Pick from and to rooms", true);
            return;
        }
        MapNode from = nodes.get(fi);
        MapNode to   = nodes.get(ti);

        SharedPreferences prefs = getSharedPreferences("people_prefs", MODE_PRIVATE);
        prefs.edit()
            .putString(PREF_LAST_FROM, from.name)
            .putString(PREF_LAST_TO,   to.name)
            .apply();

        Router router = new Router(mapData);
        List<Router.Step> path = router.findRoute(from.nodeId, to.nodeId);
        mapView.setRoute(path);

        if (path.isEmpty()) {
            routeSummary.setText("No route between these rooms.");
            setStatus("No route found", true);
            return;
        }

        StringBuilder sb = new StringBuilder();
        sb.append("Route: ").append(from.name).append(" → ").append(to.name).append("\n");
        sb.append("Rooms: ").append(path.size()).append("   ");
        int totalSteps = 0;
        for (int i = 1; i < path.size(); i++) {
            MapNode n = nodeById(path.get(i).nodeId);
            if (n != null) totalSteps += 0; // steps are per-edge; skip for brevity
        }
        sb.append("Est. ~").append(Math.max(1, path.size() - 1)).append(" hops");
        routeSummary.setText(sb.toString());

        mapView.setSelectedNode(to.nodeId);
        setStatus("Route drawn — " + path.size() + " rooms", false);

        // Recenter map on route endpoints
        mapView.setUserPosition(to.x, to.y, to.floor);
    }

    private MapNode nodeById(String nodeId) {
        for (MapNode n : nodes) if (n.nodeId.equals(nodeId)) return n;
        return null;
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private void setStatus(String msg, boolean error) {
        if (msg == null) return;
        statusText.setText(msg);
        statusText.setTextColor(error ? Color.parseColor("#D32F2F") : Color.parseColor("#212121"));
        Log.d(TAG, "Status: " + msg);
        if (error) {
            mainHandler.postDelayed(() -> {
                if (statusText.getCurrentTextColor() == Color.parseColor("#D32F2F")) {
                    statusText.setTextColor(Color.parseColor("#212121"));
                }
            }, 4000);
        }
    }

    private void runInBackground(Runnable task) {
        Thread t = new Thread(task);
        t.setDaemon(true);
        t.start();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == WifiScanner.PERM_REQ) {
            boolean ok = true;
            for (int r : grantResults) if (r != PackageManager.PERMISSION_GRANTED) ok = false;
            if (!ok) setStatus("Location permission needed for locate-me", true);
        }
    }
}
