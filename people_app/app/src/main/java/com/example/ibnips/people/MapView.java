package com.example.ibnips.people;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Rect;
import android.graphics.RectF;
import android.util.AttributeSet;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.ScaleGestureDetector;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.LinearInterpolator;

import com.example.ibnips.people.models.MapEdge;
import com.example.ibnips.people.models.MapNode;
import com.example.ibnips.people.models.MapResponse;
import com.example.ibnips.people.Router;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * High-performance, Google Maps styled indoor canvas map view.
 *
 * Visual design matches Google Maps:
 *   - Soft neutral architectural background (#F8F9FA) with crisp walkway corridors
 *   - Google Maps vibrant blue navigation polyline with round caps & borders
 *   - Iconic Google Maps Red pin for selected destinations
 *   - Green marker for navigation origin
 *   - Pulsing Google Blue location dot (#4285F4) with animated radar ripple
 *   - Clutter reduction & LOD: Viewport culling & collision-checked labels
 *   - Smooth pan, pinch-zoom, double-tap zoom, and animated centering
 *   - Tap-to-select rooms with callback to show detail sheet
 *   - Multi-floor filtering support
 */
public class MapView extends View {

    public interface OnNodeClickListener {
        void onNodeClick(MapNode node);
    }

    public interface OnMapClickListener {
        void onMapClick();
    }

    private static final float NODE_RADIUS   = 6f;
    private static final float USER_RADIUS   = 9f;
    private static final float COMPASS_SIZE  = 40f;
    private static final float PADDING       = 20f;
    private static final float MIN_SCALE     = 0.1f;
    private static final float MAX_SCALE     = 16.0f;

    // Google Maps Color Palette
    private static final int COLOR_BG             = 0xFFF8F9FA;
    private static final int COLOR_GRID           = 0xFFEBECEF;
    private static final int COLOR_CORRIDOR_BASE  = 0xFFE0E3E7;
    private static final int COLOR_CORRIDOR_INNER = 0xFFFFFFFF;
    private static final int COLOR_EDGE_NORMAL    = 0xFFBDC1C6;
    private static final int COLOR_NODE_FILL      = 0xFFFFFFFF;
    private static final int COLOR_NODE_STROKE    = 0xFF5F6368;
    private static final int COLOR_GOOGLE_BLUE    = 0xFF1A73E8;
    private static final int COLOR_ROUTE_CASING   = 0xFF1557B0;
    private static final int COLOR_GOOGLE_RED     = 0xFFEA4335;
    private static final int COLOR_GOOGLE_GREEN   = 0xFF34A853;
    private static final int COLOR_TEXT_PRIMARY   = 0xFF202124;

    private MapResponse mapData;
    private int userX = -1, userY = -1, userFloor = -1;
    private String selectedNodeId = null;
    private List<Router.Step> route = null;
    private int currentFloor = -1; // -1 means all or auto
    private final List<Integer> availableFloors = new ArrayList<>();

    private float mScale = 2.0f;
    private float mTranslateX = PADDING;
    private float mTranslateY = PADDING;
    private boolean userHasInteracted = false;
    private float lastTouchX, lastTouchY;
    private int activePointerId = MotionEvent.INVALID_POINTER_ID;

    private ScaleGestureDetector scaleDetector;
    private GestureDetector gestureDetector;
    private ValueAnimator panAnimator;

    private ValueAnimator haloAnimator;
    private float haloRadiusMult = 0f;
    private float haloAlphaMult  = 0f;

    private OnNodeClickListener nodeClickListener;
    private OnMapClickListener mapClickListener;

    private final Map<String, float[]> nodeCentres = new HashMap<>();
    private final List<RectF> drawnLabelBounds = new ArrayList<>();

    // Paints
    private final Paint bgPaint            = new Paint();
    private final Paint gridPaint          = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint corridorBasePaint  = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint corridorInnerPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint edgePaint          = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint routeCasingPaint   = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint routePaint         = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint nodePaint          = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint nodeStroke         = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint labelPaint         = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint labelHaloPaint     = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint userPaint          = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint userStroke         = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint userHalo           = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint userAccHalo        = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint pinPaint           = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint pinWhitePaint      = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint pinShadowPaint     = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint compassBg          = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint compassRing        = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint compassNorth       = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint compassSouth       = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint hintPaint          = new Paint(Paint.ANTI_ALIAS_FLAG);

    public MapView(Context context) { super(context); init(); }
    public MapView(Context context, AttributeSet attrs) { super(context, attrs); init(); }
    public MapView(Context context, AttributeSet attrs, int defStyleAttr) { super(context, attrs, defStyleAttr); init(); }

    private void init() {
        float density = getResources().getDisplayMetrics().density;

        bgPaint.setStyle(Paint.Style.FILL);
        bgPaint.setColor(COLOR_BG);

        gridPaint.setStyle(Paint.Style.STROKE);
        gridPaint.setColor(COLOR_GRID);
        gridPaint.setStrokeWidth(1f);

        corridorBasePaint.setStyle(Paint.Style.STROKE);
        corridorBasePaint.setColor(COLOR_CORRIDOR_BASE);
        corridorBasePaint.setStrokeWidth(14f * density);
        corridorBasePaint.setStrokeCap(Paint.Cap.ROUND);
        corridorBasePaint.setStrokeJoin(Paint.Join.ROUND);

        corridorInnerPaint.setStyle(Paint.Style.STROKE);
        corridorInnerPaint.setColor(COLOR_CORRIDOR_INNER);
        corridorInnerPaint.setStrokeWidth(8f * density);
        corridorInnerPaint.setStrokeCap(Paint.Cap.ROUND);
        corridorInnerPaint.setStrokeJoin(Paint.Join.ROUND);

        edgePaint.setStyle(Paint.Style.STROKE);
        edgePaint.setColor(COLOR_EDGE_NORMAL);
        edgePaint.setStrokeWidth(2f * density);
        edgePaint.setStrokeCap(Paint.Cap.ROUND);

        routeCasingPaint.setStyle(Paint.Style.STROKE);
        routeCasingPaint.setColor(COLOR_ROUTE_CASING);
        routeCasingPaint.setStrokeWidth(9f * density);
        routeCasingPaint.setStrokeCap(Paint.Cap.ROUND);
        routeCasingPaint.setStrokeJoin(Paint.Join.ROUND);

        routePaint.setStyle(Paint.Style.STROKE);
        routePaint.setColor(COLOR_GOOGLE_BLUE);
        routePaint.setStrokeWidth(6f * density);
        routePaint.setStrokeCap(Paint.Cap.ROUND);
        routePaint.setStrokeJoin(Paint.Join.ROUND);

        nodePaint.setStyle(Paint.Style.FILL);
        nodePaint.setColor(COLOR_NODE_FILL);

        nodeStroke.setStyle(Paint.Style.STROKE);
        nodeStroke.setColor(COLOR_NODE_STROKE);
        nodeStroke.setStrokeWidth(1.5f * density);

        labelPaint.setStyle(Paint.Style.FILL);
        labelPaint.setColor(COLOR_TEXT_PRIMARY);
        labelPaint.setTextSize(11f * density);
        labelPaint.setTextAlign(Paint.Align.CENTER);
        labelPaint.setFakeBoldText(true);

        labelHaloPaint.setStyle(Paint.Style.STROKE);
        labelHaloPaint.setColor(Color.WHITE);
        labelHaloPaint.setTextSize(11f * density);
        labelHaloPaint.setTextAlign(Paint.Align.CENTER);
        labelHaloPaint.setStrokeWidth(3.5f * density);
        labelHaloPaint.setStrokeCap(Paint.Cap.ROUND);
        labelHaloPaint.setStrokeJoin(Paint.Join.ROUND);

        userPaint.setStyle(Paint.Style.FILL);
        userPaint.setColor(COLOR_GOOGLE_BLUE);

        userStroke.setStyle(Paint.Style.STROKE);
        userStroke.setColor(Color.WHITE);
        userStroke.setStrokeWidth(2.5f * density);

        userHalo.setStyle(Paint.Style.FILL);
        userHalo.setColor(COLOR_GOOGLE_BLUE);

        userAccHalo.setStyle(Paint.Style.FILL);
        userAccHalo.setColor(0x281A73E8); // translucent blue 16%

        pinPaint.setStyle(Paint.Style.FILL);
        pinPaint.setColor(COLOR_GOOGLE_RED);

        pinWhitePaint.setStyle(Paint.Style.FILL);
        pinWhitePaint.setColor(Color.WHITE);

        pinShadowPaint.setStyle(Paint.Style.FILL);
        pinShadowPaint.setColor(0x40000000);

        compassBg.setStyle(Paint.Style.FILL);
        compassBg.setColor(Color.WHITE);
        compassBg.setShadowLayer(4f * density, 0, 2f * density, 0x30000000);

        compassRing.setStyle(Paint.Style.STROKE);
        compassRing.setColor(0xFFDADCE0);
        compassRing.setStrokeWidth(1.2f * density);

        compassNorth.setStyle(Paint.Style.FILL);
        compassNorth.setColor(COLOR_GOOGLE_RED);

        compassSouth.setStyle(Paint.Style.FILL);
        compassSouth.setColor(0xFF9AA0A6);

        hintPaint.setStyle(Paint.Style.FILL);
        hintPaint.setColor(0xFF80868B);
        hintPaint.setTextSize(14f * density);
        hintPaint.setTextAlign(Paint.Align.CENTER);

        initHaloAnimator();

        scaleDetector = new ScaleGestureDetector(getContext(),
                new ScaleGestureDetector.SimpleOnScaleGestureListener() {
                    @Override public boolean onScale(ScaleGestureDetector d) {
                        zoomAround(d.getFocusX(), d.getFocusY(), d.getScaleFactor());
                        return true;
                    }
                });

        gestureDetector = new GestureDetector(getContext(),
                new GestureDetector.SimpleOnGestureListener() {
                    @Override public boolean onDoubleTap(MotionEvent e) {
                        zoomAround(e.getX(), e.getY(), 1.8f);
                        return true;
                    }

                    @Override public boolean onSingleTapConfirmed(MotionEvent e) {
                        handleTap(e.getX(), e.getY());
                        return true;
                    }
                });
    }

    private void initHaloAnimator() {
        haloAnimator = ValueAnimator.ofFloat(0f, 1f);
        haloAnimator.setDuration(1600);
        haloAnimator.setRepeatCount(ValueAnimator.INFINITE);
        haloAnimator.setInterpolator(new LinearInterpolator());
        haloAnimator.addUpdateListener(animation -> {
            float v = (float) animation.getAnimatedValue();
            haloRadiusMult = v;
            haloAlphaMult  = 1f - v;
            invalidate();
        });
    }

    public void setOnNodeClickListener(OnNodeClickListener listener) {
        this.nodeClickListener = listener;
    }

    public void setOnMapClickListener(OnMapClickListener listener) {
        this.mapClickListener = listener;
    }

    public void setMapData(MapResponse data) {
        this.mapData = data;
        this.userHasInteracted = false;
        extractFloors();
        recalculateDimensions();
        invalidate();
    }

    private void extractFloors() {
        availableFloors.clear();
        if (mapData == null || mapData.nodes == null) return;
        Set<Integer> set = new HashSet<>();
        for (MapNode n : mapData.nodes) set.add(n.floor);
        availableFloors.addAll(set);
        Collections.sort(availableFloors);
        if (!availableFloors.isEmpty() && currentFloor == -1) {
            currentFloor = availableFloors.get(0);
        }
    }

    public List<Integer> getAvailableFloors() { return availableFloors; }

    public int getCurrentFloor() { return currentFloor; }

    public void setCurrentFloor(int floor) {
        if (this.currentFloor != floor) {
            this.currentFloor = floor;
            rebuildNodeCentres();
            invalidate();
        }
    }

    public void setUserPosition(int x, int y, int floor) {
        this.userX = x;
        this.userY = y;
        this.userFloor = floor;
        if (floor >= 0 && availableFloors.contains(floor)) {
            this.currentFloor = floor;
        }
        invalidate();
    }

    public void setSelectedNode(String nodeId) {
        this.selectedNodeId = nodeId;
        if (nodeId != null && mapData != null && mapData.nodes != null) {
            for (MapNode n : mapData.nodes) {
                if (n.nodeId.equals(nodeId)) {
                    if (n.floor >= 0 && availableFloors.contains(n.floor)) {
                        this.currentFloor = n.floor;
                    }
                    break;
                }
            }
        }
        invalidate();
    }

    public String getSelectedNodeId() { return selectedNodeId; }

    public MapNode getSelectedNode() {
        if (selectedNodeId == null || mapData == null || mapData.nodes == null) return null;
        for (MapNode n : mapData.nodes) {
            if (n.nodeId.equals(selectedNodeId)) return n;
        }
        return null;
    }

    public void setRoute(List<Router.Step> route) {
        this.route = route;
        if (route != null && !route.isEmpty()) {
            Router.Step first = route.get(0);
            if (first.floor >= 0 && availableFloors.contains(first.floor)) {
                this.currentFloor = first.floor;
            }
        }
        invalidate();
    }

    public void clearSelection() {
        this.selectedNodeId = null;
        this.route = null;
        invalidate();
    }

    /** Center and zoom smoothly on the user's position */
    public void centerOnUser() {
        if (userX >= 0 && userY >= 0) {
            if (userFloor >= 0 && availableFloors.contains(userFloor)) {
                this.currentFloor = userFloor;
            }
            animateTo(userX, userY, Math.max(mScale, 2.5f));
        }
    }

    /** Center and zoom smoothly on a specific node */
    public void centerOnNode(String nodeId) {
        if (mapData == null || mapData.nodes == null) return;
        for (MapNode n : mapData.nodes) {
            if (n.nodeId.equals(nodeId)) {
                if (n.floor >= 0 && availableFloors.contains(n.floor)) {
                    this.currentFloor = n.floor;
                }
                animateTo(n.x, n.y, Math.max(mScale, 2.5f));
                break;
            }
        }
    }

    public void animateTo(int mapX, int mapY, float targetScale) {
        float startTx = mTranslateX;
        float startTy = mTranslateY;
        float startScale = mScale;

        float clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetScale));
        float endTx = getWidth() / 2f - mapX * clampedScale;
        float endTy = getHeight() / 2f - mapY * clampedScale;

        if (panAnimator != null && panAnimator.isRunning()) {
            panAnimator.cancel();
        }

        panAnimator = ValueAnimator.ofFloat(0f, 1f);
        panAnimator.setDuration(450);
        panAnimator.setInterpolator(new DecelerateInterpolator());
        panAnimator.addUpdateListener(anim -> {
            float fraction = (float) anim.getAnimatedValue();
            mScale = startScale + (clampedScale - startScale) * fraction;
            mTranslateX = startTx + (endTx - startTx) * fraction;
            mTranslateY = startTy + (endTy - startTy) * fraction;
            userHasInteracted = true;
            rebuildNodeCentres();
            invalidate();
        });
        panAnimator.start();
    }

    private void handleTap(float touchX, float touchY) {
        float density = getResources().getDisplayMetrics().density;

        // Check if compass tapped:
        float compassCx = getWidth() - PADDING * density - COMPASS_SIZE * density / 2f;
        float compassCy = PADDING * density + COMPASS_SIZE * density / 2f;
        float dComp = (float) Math.hypot(touchX - compassCx, touchY - compassCy);
        if (dComp <= (COMPASS_SIZE * density / 2f) + 8f * density) {
            // Reset to fit bounds
            userHasInteracted = false;
            recalculateDimensions();
            invalidate();
            return;
        }

        if (mapData == null || mapData.nodes == null) return;

        // Hit-test nodes near tap
        float maxTapDist = 28f * density;
        MapNode bestNode = null;
        float bestDist = maxTapDist;

        for (MapNode node : mapData.nodes) {
            if (currentFloor >= 0 && node.floor != currentFloor) continue;
            float[] c = nodeCentres.get(node.nodeId);
            if (c == null) continue;
            float dist = (float) Math.hypot(touchX - c[0], touchY - c[1]);
            if (dist < bestDist) {
                bestDist = dist;
                bestNode = node;
            }
        }

        if (bestNode != null) {
            setSelectedNode(bestNode.nodeId);
            animateTo(bestNode.x, bestNode.y, Math.max(mScale, 2.2f));
            if (nodeClickListener != null) {
                nodeClickListener.onNodeClick(bestNode);
            }
        } else {
            if (mapClickListener != null) {
                mapClickListener.onMapClick();
            }
        }
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        scaleDetector.onTouchEvent(event);
        gestureDetector.onTouchEvent(event);

        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                lastTouchX = event.getX();
                lastTouchY = event.getY();
                activePointerId = event.getPointerId(0);
                if (panAnimator != null && panAnimator.isRunning()) panAnimator.cancel();
                break;
            case MotionEvent.ACTION_MOVE:
                if (scaleDetector.isInProgress()) break;
                int idx = event.findPointerIndex(activePointerId);
                if (idx < 0) break;
                float x = event.getX(idx);
                float y = event.getY(idx);
                mTranslateX += x - lastTouchX;
                mTranslateY += y - lastTouchY;
                lastTouchX = x;
                lastTouchY = y;
                userHasInteracted = true;
                rebuildNodeCentres();
                invalidate();
                break;
            case MotionEvent.ACTION_POINTER_UP: {
                int pi = event.getActionIndex();
                int pid = event.getPointerId(pi);
                if (pid == activePointerId) {
                    int ni = pi == 0 ? 1 : 0;
                    lastTouchX = event.getX(ni);
                    lastTouchY = event.getY(ni);
                    activePointerId = event.getPointerId(ni);
                }
                break;
            }
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_CANCEL:
                activePointerId = MotionEvent.INVALID_POINTER_ID;
                break;
        }
        return true;
    }

    private void zoomAround(float focusX, float focusY, float factor) {
        if (mapData == null || factor <= 0f) return;
        float newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, mScale * factor));
        if (newScale == mScale) return;
        float mapX = (focusX - mTranslateX) / mScale;
        float mapY = (focusY - mTranslateY) / mScale;
        mScale = newScale;
        mTranslateX = focusX - mapX * mScale;
        mTranslateY = focusY - mapY * mScale;
        userHasInteracted = true;
        rebuildNodeCentres();
        invalidate();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        canvas.drawRect(0, 0, getWidth(), getHeight(), bgPaint);
        drawGrid(canvas);

        if (mapData == null) {
            canvas.drawText("Fetching indoor map…", getWidth() / 2f, getHeight() / 2f, hintPaint);
            drawCompass(canvas);
            return;
        }

        drawnLabelBounds.clear();

        // 1. Walkway Corridors & Edges
        drawCorridorsAndEdges(canvas);

        // 2. Navigation Route Polyline
        if (route != null && route.size() >= 2) {
            drawRoute(canvas);
        }

        // 3. Room Nodes & Markers
        drawNodes(canvas);

        // 4. Start & End Markers for Route
        drawRouteMarkers(canvas);

        // 5. User Dot with Pulsing Halo
        drawUserPosition(canvas);

        // 6. Google Maps Floating Compass
        drawCompass(canvas);
    }

    private void drawGrid(Canvas canvas) {
        float w = getWidth(), h = getHeight();
        float step = 48f;
        for (float x = 0; x <= w; x += step) canvas.drawLine(x, 0, x, h, gridPaint);
        for (float y = 0; y <= h; y += step) canvas.drawLine(0, y, w, y, gridPaint);
    }

    private void drawCorridorsAndEdges(Canvas canvas) {
        if (mapData.edges == null) return;

        // Viewport bounds for culling
        float vLeft = -mTranslateX / mScale;
        float vTop = -mTranslateY / mScale;
        float vRight = (getWidth() - mTranslateX) / mScale;
        float vBottom = (getHeight() - mTranslateY) / mScale;

        // First pass: Draw corridor base paths (architectural walkways)
        for (MapEdge edge : mapData.edges) {
            float[] from = nodeCentres.get(edge.fromNode);
            float[] to   = nodeCentres.get(edge.toNode);
            if (from == null || to == null) continue;

            // Viewport culling
            if (Math.max(from[0], to[0]) < 0 || Math.min(from[0], to[0]) > getWidth()
                    || Math.max(from[1], to[1]) < 0 || Math.min(from[1], to[1]) > getHeight()) {
                continue;
            }

            canvas.drawLine(from[0], from[1], to[0], to[1], corridorBasePaint);
        }

        // Second pass: Inner white walkway line
        for (MapEdge edge : mapData.edges) {
            float[] from = nodeCentres.get(edge.fromNode);
            float[] to   = nodeCentres.get(edge.toNode);
            if (from == null || to == null) continue;

            if (Math.max(from[0], to[0]) < 0 || Math.min(from[0], to[0]) > getWidth()
                    || Math.max(from[1], to[1]) < 0 || Math.min(from[1], to[1]) > getHeight()) {
                continue;
            }

            canvas.drawLine(from[0], from[1], to[0], to[1], corridorInnerPaint);
        }
    }

    private void drawRoute(Canvas canvas) {
        float density = getResources().getDisplayMetrics().density;
        Path path = new Path();
        boolean first = true;

        for (Router.Step step : route) {
            float[] c = nodeCentres.get(step.nodeId);
            if (c == null) continue;
            if (first) {
                path.moveTo(c[0], c[1]);
                first = false;
            } else {
                path.lineTo(c[0], c[1]);
            }
        }

        // Draw outer casing for contrast
        canvas.drawPath(path, routeCasingPaint);
        // Draw Google Blue route
        canvas.drawPath(path, routePaint);

        // Waypoints dots
        Paint dotPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        dotPaint.setStyle(Paint.Style.FILL);
        dotPaint.setColor(Color.WHITE);
        Paint dotBorder = new Paint(Paint.ANTI_ALIAS_FLAG);
        dotBorder.setStyle(Paint.Style.STROKE);
        dotBorder.setColor(COLOR_ROUTE_CASING);
        dotBorder.setStrokeWidth(1.5f * density);

        for (int i = 1; i < route.size() - 1; i++) {
            float[] c = nodeCentres.get(route.get(i).nodeId);
            if (c == null) continue;
            canvas.drawCircle(c[0], c[1], 4f * density, dotPaint);
            canvas.drawCircle(c[0], c[1], 4f * density, dotBorder);
        }
    }

    private void drawNodes(Canvas canvas) {
        if (mapData.nodes == null) return;
        float density = getResources().getDisplayMetrics().density;
        float nodeR = NODE_RADIUS * density;

        // Viewport bounds
        float w = getWidth(), h = getHeight();

        // Nodes rendering
        for (MapNode node : mapData.nodes) {
            if (currentFloor >= 0 && node.floor != currentFloor) continue;
            float[] centre = nodeCentres.get(node.nodeId);
            if (centre == null) continue;

            // Cull if outside viewport
            if (centre[0] < -40f || centre[0] > w + 40f || centre[1] < -40f || centre[1] > h + 40f) {
                continue;
            }

            boolean isSelected = selectedNodeId != null && selectedNodeId.equals(node.nodeId);
            boolean isRouteEndpoint = route != null && route.size() >= 1 &&
                    (route.get(0).nodeId.equals(node.nodeId) || route.get(route.size() - 1).nodeId.equals(node.nodeId));

            if (!isSelected && !isRouteEndpoint) {
                // Regular clean POI circle
                canvas.drawCircle(centre[0], centre[1], nodeR, nodePaint);
                canvas.drawCircle(centre[0], centre[1], nodeR, nodeStroke);
            }

            // Labels with decluttering & Level of Detail (LOD)
            boolean shouldDrawLabel = isSelected || isRouteEndpoint || mScale >= 1.6f;
            if (shouldDrawLabel) {
                String label = (node.name != null && !node.name.isEmpty()) ? node.name : node.nodeId;
                drawCollidingLabel(canvas, label, centre[0], centre[1] + nodeR + 12f * density, isSelected);
            }
        }

        // If selected node exists, draw Google Maps Red Pin
        if (selectedNodeId != null) {
            MapNode sel = getSelectedNode();
            if (sel != null && (currentFloor < 0 || sel.floor == currentFloor)) {
                float[] centre = nodeCentres.get(sel.nodeId);
                if (centre != null) {
                    drawGooglePin(canvas, centre[0], centre[1], COLOR_GOOGLE_RED, true);
                }
            }
        }
    }

    private void drawRouteMarkers(Canvas canvas) {
        if (route == null || route.isEmpty()) return;
        // Start marker (Green Pin / dot)
        Router.Step start = route.get(0);
        float[] startC = nodeCentres.get(start.nodeId);
        if (startC != null && (currentFloor < 0 || start.floor == currentFloor)) {
            drawGooglePin(canvas, startC[0], startC[1], COLOR_GOOGLE_GREEN, false);
        }

        // End marker (Red Destination Pin)
        if (route.size() > 1) {
            Router.Step end = route.get(route.size() - 1);
            float[] endC = nodeCentres.get(end.nodeId);
            if (endC != null && (currentFloor < 0 || end.floor == currentFloor)) {
                drawGooglePin(canvas, endC[0], endC[1], COLOR_GOOGLE_RED, true);
            }
        }
    }

    /** Draws an authentic Google Maps drop pin pointing to (cx, cy) */
    private void drawGooglePin(Canvas canvas, float cx, float cy, int pinColor, boolean isDestination) {
        float density = getResources().getDisplayMetrics().density;
        float pinW = 22f * density;
        float pinH = 32f * density;
        float topCy = cy - pinH + pinW / 2f;

        // Soft drop shadow under the pin tip
        canvas.drawOval(new RectF(cx - 7f * density, cy - 2.5f * density, cx + 7f * density, cy + 2.5f * density), pinShadowPaint);

        // Pin Body
        Path pinPath = new Path();
        pinPath.moveTo(cx, cy);
        pinPath.cubicTo(cx - pinW * 0.45f, cy - pinH * 0.35f, cx - pinW / 2f, topCy + pinW * 0.25f, cx - pinW / 2f, topCy);
        pinPath.arcTo(new RectF(cx - pinW / 2f, topCy - pinW / 2f, cx + pinW / 2f, topCy + pinW / 2f), 180, 180, false);
        pinPath.cubicTo(cx + pinW / 2f, topCy + pinW * 0.25f, cx + pinW * 0.45f, cy - pinH * 0.35f, cx, cy);
        pinPath.close();

        pinPaint.setColor(pinColor);
        canvas.drawPath(pinPath, pinPaint);

        // White inner circle
        canvas.drawCircle(cx, topCy, pinW * 0.24f, pinWhitePaint);

        // Inner icon dot if destination
        if (isDestination) {
            Paint innerDot = new Paint(Paint.ANTI_ALIAS_FLAG);
            innerDot.setStyle(Paint.Style.FILL);
            innerDot.setColor(pinColor);
            canvas.drawCircle(cx, topCy, pinW * 0.12f, innerDot);
        }
    }

    private void drawCollidingLabel(Canvas canvas, String text, float x, float y, boolean force) {
        Rect bounds = new Rect();
        labelPaint.getTextBounds(text, 0, text.length(), bounds);
        float w = bounds.width() + 10;
        float h = bounds.height() + 8;
        RectF labelRect = new RectF(x - w / 2f, y - h, x + w / 2f, y);

        if (!force) {
            // Check collision with already drawn labels
            for (RectF r : drawnLabelBounds) {
                if (RectF.intersects(r, labelRect)) {
                    return; // Skip overlapping label to maintain Google Maps clean look
                }
            }
        }

        drawnLabelBounds.add(labelRect);

        // Crisp white halo behind text
        canvas.drawText(text, x, y, labelHaloPaint);
        // Primary text
        canvas.drawText(text, x, y, labelPaint);
    }

    private void drawUserPosition(Canvas canvas) {
        if (userX < 0 || userY < 0) return;
        if (currentFloor >= 0 && userFloor >= 0 && userFloor != currentFloor) return;

        float density = getResources().getDisplayMetrics().density;
        float cx = toCanvasX(userX), cy = toCanvasY(userY);

        // Soft accuracy halo
        canvas.drawCircle(cx, cy, 22f * density, userAccHalo);

        // Animated expanding pulse radar ripple
        if (haloAlphaMult > 0) {
            float rStart = 12f * density, rEnd = 30f * density;
            float r = rStart + (rEnd - rStart) * haloRadiusMult;
            userHalo.setAlpha((int) (haloAlphaMult * 90));
            canvas.drawCircle(cx, cy, r, userHalo);
        }

        // Signature Google Blue Dot with white border
        canvas.drawCircle(cx, cy, USER_RADIUS * density, userPaint);
        canvas.drawCircle(cx, cy, USER_RADIUS * density, userStroke);
    }

    private void drawCompass(Canvas canvas) {
        float density = getResources().getDisplayMetrics().density;
        float cx = getWidth() - PADDING * density - COMPASS_SIZE * density / 2f;
        float cy = PADDING * density + COMPASS_SIZE * density / 2f;
        float r = COMPASS_SIZE * density * 0.45f;

        // White floating circle with drop shadow
        canvas.drawCircle(cx, cy, COMPASS_SIZE * density / 2f, compassBg);
        canvas.drawCircle(cx, cy, COMPASS_SIZE * density / 2f, compassRing);

        // North Needle (Google Red)
        Path north = new Path();
        north.moveTo(cx, cy - r);
        north.lineTo(cx - r * 0.32f, cy);
        north.lineTo(cx + r * 0.32f, cy);
        north.close();
        canvas.drawPath(north, compassNorth);

        // South Needle (Grey)
        Path south = new Path();
        south.moveTo(cx, cy + r);
        south.lineTo(cx - r * 0.32f, cy);
        south.lineTo(cx + r * 0.32f, cy);
        south.close();
        canvas.drawPath(south, compassSouth);
    }

    @Override
    protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        if (haloAnimator != null && !haloAnimator.isRunning()) haloAnimator.start();
    }

    @Override
    protected void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        if (haloAnimator != null) haloAnimator.cancel();
        if (panAnimator != null) panAnimator.cancel();
    }

    @Override
    protected void onVisibilityChanged(View changedView, int visibility) {
        super.onVisibilityChanged(changedView, visibility);
        if (haloAnimator == null) return;
        if (visibility == View.VISIBLE) {
            if (!haloAnimator.isRunning()) haloAnimator.start();
        } else {
            haloAnimator.cancel();
        }
    }

    @Override
    protected void onSizeChanged(int w, int h, int oldw, int oldh) {
        super.onSizeChanged(w, h, oldw, oldh);
        recalculateDimensions();
    }

    private float toCanvasX(int mapX) { return mapX * mScale + mTranslateX; }
    private float toCanvasY(int mapY) { return mapY * mScale + mTranslateY; }

    private void rebuildNodeCentres() {
        nodeCentres.clear();
        if (mapData == null || mapData.nodes == null) return;
        for (MapNode node : mapData.nodes) {
            nodeCentres.put(node.nodeId, new float[]{toCanvasX(node.x), toCanvasY(node.y)});
        }
    }

    private void recalculateDimensions() {
        if (userHasInteracted) {
            rebuildNodeCentres();
            return;
        }
        int w = getWidth(), h = getHeight();
        if (w <= 0 || h <= 0 || mapData == null || mapData.nodes == null || mapData.nodes.isEmpty()) {
            mScale = 2.0f;
            mTranslateX = PADDING;
            mTranslateY = PADDING;
            rebuildNodeCentres();
            return;
        }
        int minX = Integer.MAX_VALUE, maxX = Integer.MIN_VALUE;
        int minY = Integer.MAX_VALUE, maxY = Integer.MIN_VALUE;
        for (MapNode node : mapData.nodes) {
            if (node.x < minX) minX = node.x;
            if (node.x > maxX) maxX = node.x;
            if (node.y < minY) minY = node.y;
            if (node.y > maxY) maxY = node.y;
        }
        float mapWidth = maxX - minX;
        if (mapWidth <= 0) mapWidth = 1f;
        float mapHeight = maxY - minY;
        if (mapHeight <= 0) mapHeight = 1f;

        float padding = 36f;
        float scaleX = (w - 2 * padding) / mapWidth;
        float scaleY = (h - 2 * padding) / mapHeight;
        mScale = Math.min(scaleX, scaleY);

        float scaledW = mapWidth * mScale, scaledH = mapHeight * mScale;
        mTranslateX = (w - scaledW) / 2f - minX * mScale;
        mTranslateY = (h - scaledH) / 2f - minY * mScale;
        rebuildNodeCentres();
    }
}
