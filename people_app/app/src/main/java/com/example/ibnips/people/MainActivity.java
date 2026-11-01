package com.example.ibnips.people;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.Log;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.AutoCompleteTextView;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import com.example.ibnips.people.models.FeedbackItem;
import com.example.ibnips.people.models.FeedbackResponse;
import com.example.ibnips.people.models.MapNode;
import com.example.ibnips.people.models.MapResponse;
import com.example.ibnips.people.models.PositionResponse;
import com.example.ibnips.people.models.WifiScanResult;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

/**
 * MainActivity — Google Maps look-and-feel indoor navigation app.
 *
 * Capabilities:
 *   - Fullscreen architectural canvas with Google Maps styling
 *   - Google Maps top floating search bar with auto-complete
 *   - Floating Locate-Me FAB with local Wi-Fi fingerprint matching
 *   - Floating Directions FAB with instant A* pathfinding
 *   - Vertical floor selector pill
 *   - Interactive Room Detail POI bottom sheet
 *   - Turn-by-turn directions bottom sheet (RouteSheet)
 *   - Public feedback and rating sheet (ReviewSheet)
 */
public class MainActivity extends Activity {

    private static final String TAG = "ibnIPS-People";
    private static final String PREF_LAST_FROM = "last_from_node";
    private static final String PREF_LAST_TO   = "last_to_node";

    // ---- Views ----
    private MapView              mapView;
    private View                 topSearchCard;
    private AutoCompleteTextView searchRooms;
    private Button               btnClearSearch;
    private LinearLayout         floorSwitcher;
    private LinearLayout         floatingFabGroup;
    private FrameLayout          fabLocate;
    private FrameLayout          fabDirections;
    private TextView             statusText;

    // Room detail POI sheet
    private LinearLayout         panelRoomDetail;
    private TextView             roomDetailTitle;
    private TextView             roomDetailSubtitle;
    private Button               btnCloseRoomDetail;
    private Button               btnRoomDirections;
    private Button               btnRoomFromHere;
    private Button               btnRoomReviews;

    // Directions top card
    private LinearLayout         panelRouteDirections;
    private Spinner              spinnerFrom;
    private Spinner              spinnerTo;
    private Button               btnSwapRoute;
    private Button               btnCloseRouteHeader;
    private TextView             routeSummary;
    private Button               btnViewSteps;

    // Reviews full panel
    private LinearLayout         panelReviews;
    private TextView             reviewsHeaderTitle;
    private TextView             reviewsCountBadge;
    private ScrollView           reviewsScroll;
    private LinearLayout         reviewsList;

    // Bottom Navigation Bar
    private LinearLayout         bottomNavBar;
    private LinearLayout         tabMapLayout, tabRouteLayout, tabReviewsLayout;
    private TextView             tabMapText, tabRouteText, tabReviewsText;

    // ---- Helpers & State ----
    private final HttpClient http = new HttpClient();
    private MapResponse mapData;
    private final List<MapNode> nodes = new ArrayList<>();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final List<FeedbackItem> feedbackItems = new ArrayList<>();

    private ReviewSheet reviewSheet;
    private RouteSheet routeSheet;
    private List<Router.Step> currentRoute = null;
    private int currentTab = 0; // 0=Explore, 1=Directions, 2=Reviews

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.main);

        reviewSheet = new ReviewSheet(this);
        routeSheet  = new RouteSheet(this);
        routeSheet.setOnRouteActionListener(() -> clearCurrentRoute());

        bindViews();
        setupListeners();

        WifiScanner.requestLocationPermissions(this);
        loadMap();
        loadReviews();

        setTab(0);
    }

    private void bindViews() {
        mapView              = findViewById(R.id.mapView);
        topSearchCard        = findViewById(R.id.topSearchCard);
        searchRooms          = findViewById(R.id.searchRooms);
        btnClearSearch       = findViewById(R.id.btnClearSearch);
        floorSwitcher        = findViewById(R.id.floorSwitcher);
        floatingFabGroup     = findViewById(R.id.floatingFabGroup);
        fabLocate            = findViewById(R.id.fabLocate);
        fabDirections        = findViewById(R.id.fabDirections);
        statusText           = findViewById(R.id.statusText);

        panelRoomDetail      = findViewById(R.id.panelRoomDetail);
        roomDetailTitle      = findViewById(R.id.roomDetailTitle);
        roomDetailSubtitle   = findViewById(R.id.roomDetailSubtitle);
        btnCloseRoomDetail   = findViewById(R.id.btnCloseRoomDetail);
        btnRoomDirections    = findViewById(R.id.btnRoomDirections);
        btnRoomFromHere      = findViewById(R.id.btnRoomFromHere);
        btnRoomReviews       = findViewById(R.id.btnRoomReviews);

        panelRouteDirections = findViewById(R.id.panelRouteDirections);
        spinnerFrom          = findViewById(R.id.spinnerFrom);
        spinnerTo            = findViewById(R.id.spinnerTo);
        btnSwapRoute         = findViewById(R.id.btnSwapRoute);
        btnCloseRouteHeader  = findViewById(R.id.btnCloseRouteHeader);
        routeSummary         = findViewById(R.id.routeSummary);
        btnViewSteps         = findViewById(R.id.btnViewSteps);

        panelReviews         = findViewById(R.id.panelReviews);
        reviewsHeaderTitle   = findViewById(R.id.reviewsHeaderTitle);
        reviewsCountBadge    = findViewById(R.id.reviewsCountBadge);
        reviewsScroll        = findViewById(R.id.reviewsScroll);
        reviewsList          = findViewById(R.id.reviewsList);

        bottomNavBar         = findViewById(R.id.bottomNavBar);
        tabMapLayout         = findViewById(R.id.tabMapLayout);
        tabRouteLayout       = findViewById(R.id.tabRouteLayout);
        tabReviewsLayout     = findViewById(R.id.tabReviewsLayout);
        tabMapText           = findViewById(R.id.tabMapText);
        tabRouteText         = findViewById(R.id.tabRouteText);
        tabReviewsText       = findViewById(R.id.tabReviewsText);
    }

    private void setupListeners() {
        // Bottom Navigation Tabs
        tabMapLayout.setOnClickListener(v -> setTab(0));
        tabRouteLayout.setOnClickListener(v -> setTab(1));
        tabReviewsLayout.setOnClickListener(v -> setTab(2));

        // Map View Touch Callbacks
        mapView.setOnNodeClickListener(node -> showRoomDetailSheet(node));
        mapView.setOnMapClickListener(() -> {
            hideRoomDetailSheet();
            hideKeyboard();
        });

        // Floating Action Buttons
        fabLocate.setOnClickListener(v -> onLocateClicked());
        fabDirections.setOnClickListener(v -> openDirectionsMode(null, null));

        // Top Search Bar
        searchRooms.setOnItemClickListener((parent, view, position, id) -> {
            String selectedName = (String) parent.getItemAtPosition(position);
            MapNode node = findNodeByName(selectedName);
            if (node != null) {
                mapView.setSelectedNode(node.nodeId);
                mapView.centerOnNode(node.nodeId);
                showRoomDetailSheet(node);
            }
            hideKeyboard();
        });

        searchRooms.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_SEARCH) {
                String query = searchRooms.getText().toString().trim();
                MapNode node = findNodeByName(query);
                if (node != null) {
                    mapView.setSelectedNode(node.nodeId);
                    mapView.centerOnNode(node.nodeId);
                    showRoomDetailSheet(node);
                } else if (!nodes.isEmpty()) {
                    showStatus("Room not found", true);
                }
                hideKeyboard();
                return true;
            }
            return false;
        });

        searchRooms.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                btnClearSearch.setVisibility(s.length() > 0 ? View.VISIBLE : View.GONE);
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        btnClearSearch.setOnClickListener(v -> {
            searchRooms.setText("");
            mapView.clearSelection();
            hideRoomDetailSheet();
        });

        // Room Detail Sheet Actions
        btnCloseRoomDetail.setOnClickListener(v -> {
            hideRoomDetailSheet();
            mapView.clearSelection();
        });

        btnRoomDirections.setOnClickListener(v -> {
            MapNode dest = mapView.getSelectedNode();
            if (dest != null) {
                // If user location is known, start from user's nearest node; else from first available
                MapNode origin = getOriginNodeForRouting(dest);
                openDirectionsMode(origin, dest);
            }
            hideRoomDetailSheet();
        });

        btnRoomFromHere.setOnClickListener(v -> {
            MapNode origin = mapView.getSelectedNode();
            if (origin != null) {
                openDirectionsMode(origin, null);
            }
            hideRoomDetailSheet();
        });

        btnRoomReviews.setOnClickListener(v -> {
            MapNode sel = mapView.getSelectedNode();
            String name = sel != null ? sel.name : "";
            reviewSheet.show(feedbackItems, name);
        });

        // Route Top Card Actions
        btnSwapRoute.setOnClickListener(v -> swapRouteSelection());
        btnCloseRouteHeader.setOnClickListener(v -> closeDirectionsMode());
        btnViewSteps.setOnClickListener(v -> {
            if (currentRoute != null && !currentRoute.isEmpty()) {
                int fi = spinnerFrom.getSelectedItemPosition();
                int ti = spinnerTo.getSelectedItemPosition();
                String fn = (fi >= 0 && fi < nodes.size()) ? nodes.get(fi).name : "Start";
                String tn = (ti >= 0 && ti < nodes.size()) ? nodes.get(ti).name : "End";
                routeSheet.show(currentRoute, fn, tn);
            } else {
                showStatus("No route to display", true);
            }
        });

        AdapterView.OnItemSelectedListener routeSpinnerListener = new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                calculateAndDrawRoute();
            }
            @Override public void onNothingSelected(AdapterView<?> parent) {}
        };
        spinnerFrom.setOnItemSelectedListener(routeSpinnerListener);
        spinnerTo.setOnItemSelectedListener(routeSpinnerListener);
    }

    // ------------------------------------------------------------------
    // Tabs Navigation
    // ------------------------------------------------------------------

    private void setTab(int tab) {
        currentTab = tab;

        // Bottom nav styling
        int blue = Color.parseColor("#1A73E8");
        int grey = Color.parseColor("#5F6368");

        tabMapText.setTextColor(tab == 0 ? blue : grey);
        tabRouteText.setTextColor(tab == 1 ? blue : grey);
        tabReviewsText.setTextColor(tab == 2 ? blue : grey);

        tabMapText.getPaint().setFakeBoldText(tab == 0);
        tabRouteText.getPaint().setFakeBoldText(tab == 1);
        tabReviewsText.getPaint().setFakeBoldText(tab == 2);

        if (tab == 0) {
            // Explore Map mode
            panelReviews.setVisibility(View.GONE);
            panelRouteDirections.setVisibility(View.GONE);
            topSearchCard.setVisibility(View.VISIBLE);
            floatingFabGroup.setVisibility(View.VISIBLE);
        } else if (tab == 1) {
            // Directions mode
            panelReviews.setVisibility(View.GONE);
            topSearchCard.setVisibility(View.GONE);
            hideRoomDetailSheet();
            panelRouteDirections.setVisibility(View.VISIBLE);
            floatingFabGroup.setVisibility(View.VISIBLE);
            calculateAndDrawRoute();
        } else if (tab == 2) {
            // Reviews mode
            panelReviews.setVisibility(View.VISIBLE);
            panelRouteDirections.setVisibility(View.GONE);
            topSearchCard.setVisibility(View.GONE);
            floatingFabGroup.setVisibility(View.GONE);
            hideRoomDetailSheet();
            renderReviewsList();
        }
    }

    // ------------------------------------------------------------------
    // Map Data & Floor Selector
    // ------------------------------------------------------------------

    private void loadMap() {
        showStatus("Fetching indoor map…", false);
        runInBackground(() -> {
            MapResponse data = http.getMap(null);
            final String err = http.getLastError();
            mainHandler.post(() -> {
                if (data == null) {
                    showStatus("Map load error: " + err, true);
                    return;
                }
                mapData = data;
                nodes.clear();
                if (data.nodes != null) nodes.addAll(data.nodes);
                mapView.setMapData(data);

                setupSearchAutoComplete();
                setupRouteSpinners();
                setupFloorSwitcher();

                int n = data.nodes != null ? data.nodes.size() : 0;
                int e = data.edges != null ? data.edges.size() : 0;
                showStatus(n + " rooms, " + e + " paths loaded", false);
            });
        });
    }

    private void setupSearchAutoComplete() {
        List<String> names = new ArrayList<>();
        for (MapNode n : nodes) {
            if (n.name != null && !n.name.isEmpty()) names.add(n.name);
        }
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this,
                android.R.layout.simple_dropdown_item_1line, names);
        searchRooms.setAdapter(adapter);
    }

    private void setupFloorSwitcher() {
        floorSwitcher.removeAllViews();
        List<Integer> floors = mapView.getAvailableFloors();
        if (floors == null || floors.size() <= 1) {
            floorSwitcher.setVisibility(View.GONE);
            return;
        }

        floorSwitcher.setVisibility(View.VISIBLE);
        int current = mapView.getCurrentFloor();

        // Display floors in descending order (top floors on top)
        List<Integer> reversedFloors = new ArrayList<>(floors);
        Collections.reverse(reversedFloors);

        for (int floor : reversedFloors) {
            TextView btn = new TextView(this);
            btn.setText("F" + floor);
            btn.setTextSize(12f);
            btn.setGravity(Gravity.CENTER);
            btn.setPadding(18, 12, 18, 12);

            boolean isCurrent = (floor == current);
            btn.setTextColor(isCurrent ? Color.WHITE : Color.parseColor("#5F6368"));
            btn.getPaint().setFakeBoldText(isCurrent);
            if (isCurrent) {
                btn.setBackgroundColor(Color.parseColor("#1A73E8"));
            } else {
                btn.setBackgroundColor(Color.TRANSPARENT);
            }

            btn.setOnClickListener(v -> {
                mapView.setCurrentFloor(floor);
                setupFloorSwitcher();
                showStatus("Floor " + floor, false);
            });

            floorSwitcher.addView(btn);
        }
    }

    // ------------------------------------------------------------------
    // Room Detail Sheet
    // ------------------------------------------------------------------

    private void showRoomDetailSheet(MapNode node) {
        if (node == null) return;
        roomDetailTitle.setText(node.name != null && !node.name.isEmpty() ? node.name : node.nodeId);
        roomDetailSubtitle.setText("Floor " + node.floor + " • Indoor Room");
        panelRoomDetail.setVisibility(View.VISIBLE);
    }

    private void hideRoomDetailSheet() {
        panelRoomDetail.setVisibility(View.GONE);
    }

    // ------------------------------------------------------------------
    // Locate Me (Local Wi-Fi Fingerprinting)
    // ------------------------------------------------------------------

    private void onLocateClicked() {
        if (!WifiScanner.isReady(this)) {
            showStatus("Enable Wi-Fi and Location", true);
            Toast.makeText(this, "Enable Wi-Fi and Location to locate yourself", Toast.LENGTH_SHORT).show();
            return;
        }

        showStatus("Scanning Wi-Fi…", false);
        WifiScanner.startScan(this);

        mainHandler.postDelayed(() -> {
            List<WifiScanResult> scans = WifiScanner.getResults(this);
            if (scans.isEmpty()) {
                showStatus("No Wi-Fi signals detected", true);
                return;
            }

            if (mapData == null || mapData.fingerprints == null || mapData.fingerprints.isEmpty()) {
                showStatus("No fingerprint dataset found", true);
                return;
            }

            MapNode bestNode = null;
            int bestScore = 0;
            for (MapNode node : nodes) {
                List<WifiScanResult> fp = mapData.fingerprints.get(node.nodeId);
                if (fp == null || fp.isEmpty()) continue;
                int score = matchFingerprints(scans, fp);
                if (score > bestScore) {
                    bestScore = score;
                    bestNode = node;
                }
            }

            final MapNode match = bestNode;
            final int score = bestScore;
            mainHandler.post(() -> {
                if (match == null || score < 1) {
                    showStatus("Location uncertain — weak match", true);
                    return;
                }
                mapView.setUserPosition(match.x, match.y, match.floor);
                mapView.centerOnUser();
                setupFloorSwitcher();
                showStatus("Near " + match.name + " (" + score + " signals)", false);
                Toast.makeText(MainActivity.this, "Located near " + match.name, Toast.LENGTH_SHORT).show();
            });
        }, 2000);
    }

    private int matchFingerprints(List<WifiScanResult> scans, List<WifiScanResult> fp) {
        int count = 0;
        for (WifiScanResult s : scans) {
            for (WifiScanResult f : fp) {
                if (s.bssid.equalsIgnoreCase(f.bssid)) {
                    count++;
                    break;
                }
            }
        }
        return count;
    }

    private MapNode getOriginNodeForRouting(MapNode exclude) {
        // If user is located, prefer the node closest to user position
        if (mapView.getSelectedNode() != null) {
            // origin can default to first different node
            for (MapNode n : nodes) {
                if (!n.nodeId.equals(exclude.nodeId)) return n;
            }
        }
        for (MapNode n : nodes) {
            if (!n.nodeId.equals(exclude.nodeId)) return n;
        }
        return exclude;
    }

    // ------------------------------------------------------------------
    // Directions & Routing Mode
    // ------------------------------------------------------------------

    private void setupRouteSpinners() {
        List<String> names = new ArrayList<>();
        for (MapNode n : nodes) names.add(n.name != null && !n.name.isEmpty() ? n.name : n.nodeId);

        ArrayAdapter<String> adapter = new ArrayAdapter<>(this,
                android.R.layout.simple_spinner_item, names);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerFrom.setAdapter(adapter);
        spinnerTo.setAdapter(adapter);

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
        } else if (nodes.size() > 1) {
            spinnerTo.setSelection(1);
        }
    }

    public void openDirectionsMode(MapNode origin, MapNode dest) {
        setTab(1);
        if (origin != null) {
            int idx = indexOfNodeId(origin.nodeId);
            if (idx >= 0) spinnerFrom.setSelection(idx);
        }
        if (dest != null) {
            int idx = indexOfNodeId(dest.nodeId);
            if (idx >= 0) spinnerTo.setSelection(idx);
        }
        calculateAndDrawRoute();
    }

    private void closeDirectionsMode() {
        setTab(0);
        clearCurrentRoute();
    }

    private void swapRouteSelection() {
        int fi = spinnerFrom.getSelectedItemPosition();
        int ti = spinnerTo.getSelectedItemPosition();
        if (fi >= 0 && ti >= 0) {
            spinnerFrom.setSelection(ti);
            spinnerTo.setSelection(fi);
            calculateAndDrawRoute();
        }
    }

    private void calculateAndDrawRoute() {
        int fi = spinnerFrom.getSelectedItemPosition();
        int ti = spinnerTo.getSelectedItemPosition();
        if (fi < 0 || ti < 0 || fi >= nodes.size() || ti >= nodes.size()) {
            routeSummary.setText("Select rooms to see route");
            return;
        }

        MapNode from = nodes.get(fi);
        MapNode to   = nodes.get(ti);

        SharedPreferences prefs = getSharedPreferences("people_prefs", MODE_PRIVATE);
        prefs.edit()
                .putString(PREF_LAST_FROM, from.name)
                .putString(PREF_LAST_TO, to.name)
                .apply();

        if (from.nodeId.equals(to.nodeId)) {
            currentRoute = Collections.emptyList();
            mapView.setRoute(currentRoute);
            routeSummary.setText("Origin and destination are the same room.");
            return;
        }

        Router router = new Router(mapData);
        List<Router.Step> path = router.findRoute(from.nodeId, to.nodeId);
        currentRoute = path;
        mapView.setRoute(path);

        if (path.isEmpty()) {
            routeSummary.setText("No walkable route found between rooms.");
            showStatus("No route found", true);
            return;
        }

        int hops = Math.max(1, path.size() - 1);
        int mins = Math.max(1, (hops + 1) / 2);
        routeSummary.setText("~" + mins + " min walk (" + hops + " hops) • " + from.name + " → " + to.name);

        mapView.centerOnNode(to.nodeId);
        showStatus("Route drawn • ~" + mins + " min walk", false);
    }

    private void clearCurrentRoute() {
        currentRoute = null;
        mapView.setRoute(null);
        routeSummary.setText("Select rooms to see route");
    }

    // ------------------------------------------------------------------
    // Reviews
    // ------------------------------------------------------------------

    private void loadReviews() {
        runInBackground(() -> {
            FeedbackResponse resp = http.getFeedback();
            mainHandler.post(() -> {
                feedbackItems.clear();
                if (resp != null && resp.items != null) {
                    feedbackItems.addAll(resp.items);
                }
                reviewsCountBadge.setText(feedbackItems.size() + " reviews");
                if (currentTab == 2) renderReviewsList();
            });
        });
    }

    private void renderReviewsList() {
        reviewsList.removeAllViews();
        if (feedbackItems.isEmpty()) {
            TextView empty = new TextView(this);
            empty.setText("No reviews submitted yet.");
            empty.setTextColor(Color.parseColor("#80868B"));
            empty.setTextSize(14f);
            empty.setPadding(40, 40, 40, 40);
            empty.setGravity(Gravity.CENTER);
            reviewsList.addView(empty);
            return;
        }

        LayoutInflater inf = LayoutInflater.from(this);
        for (FeedbackItem item : feedbackItems) {
            View row = inf.inflate(R.layout.item_review, reviewsList, false);
            TextView avatar   = row.findViewById(R.id.reviewAvatar);
            TextView username = row.findViewById(R.id.reviewUsername);
            TextView stars    = row.findViewById(R.id.reviewStars);
            TextView date     = row.findViewById(R.id.reviewDate);
            TextView comment  = row.findViewById(R.id.reviewComment);

            String name = (item.username != null && !item.username.trim().isEmpty()) ? item.username : "Anonymous";
            username.setText(name);
            avatar.setText(name.substring(0, 1).toUpperCase(Locale.getDefault()));

            String starStr = item.stars();
            if (starStr != null && !starStr.isEmpty()) {
                stars.setText(starStr);
                stars.setVisibility(View.VISIBLE);
            } else {
                stars.setVisibility(View.GONE);
            }

            if (item.createdAt != null && item.createdAt.length() >= 10) {
                date.setText(item.createdAt.substring(0, 10));
                date.setVisibility(View.VISIBLE);
            } else {
                date.setVisibility(View.GONE);
            }

            comment.setText((item.comment != null && !item.comment.isEmpty()) ? item.comment : "—");
            reviewsList.addView(row);
        }
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private MapNode findNodeByName(String name) {
        if (name == null || name.isEmpty()) return null;
        for (MapNode n : nodes) {
            if (n.name != null && n.name.equalsIgnoreCase(name.trim())) return n;
        }
        return null;
    }

    private int indexOfNodeName(String name) {
        for (int i = 0; i < nodes.size(); i++) {
            if (nodes.get(i).name != null && nodes.get(i).name.equalsIgnoreCase(name)) return i;
        }
        return -1;
    }

    private int indexOfNodeId(String nodeId) {
        for (int i = 0; i < nodes.size(); i++) {
            if (nodes.get(i).nodeId != null && nodes.get(i).nodeId.equals(nodeId)) return i;
        }
        return -1;
    }

    private void showStatus(String msg, boolean error) {
        if (msg == null) return;
        statusText.setText(msg);
        statusText.setTextColor(error ? Color.parseColor("#D93025") : Color.parseColor("#1A73E8"));
        statusText.setVisibility(View.VISIBLE);
        Log.d(TAG, "Status: " + msg);

        mainHandler.removeCallbacksAndMessages(statusText);
        mainHandler.postDelayed(() -> statusText.setVisibility(View.GONE), 3500);
    }

    private void hideKeyboard() {
        View view = getCurrentFocus();
        if (view != null) {
            InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
            if (imm != null) imm.hideSoftInputFromWindow(view.getWindowToken(), 0);
        }
    }

    private void runInBackground(Runnable r) {
        Thread t = new Thread(r);
        t.setDaemon(true);
        t.start();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == WifiScanner.PERM_REQ) {
            boolean ok = true;
            for (int r : grantResults) {
                if (r != PackageManager.PERMISSION_GRANTED) ok = false;
            }
            if (!ok) showStatus("Location permission needed for Wi-Fi locate", true);
        }
    }

    @Override
    public void onBackPressed() {
        if (panelRoomDetail.getVisibility() == View.VISIBLE) {
            hideRoomDetailSheet();
            mapView.clearSelection();
            return;
        }
        if (currentTab != 0) {
            setTab(0);
            return;
        }
        super.onBackPressed();
    }
}
