package com.example.ibnips.people;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.util.AttributeSet;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.ScaleGestureDetector;
import android.view.View;

import com.example.ibnips.people.models.MapEdge;
import com.example.ibnips.people.models.MapNode;
import com.example.ibnips.people.models.MapResponse;
import com.example.ibnips.people.Router;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Custom View rendering the indoor floor map.
 *
 * Features:
 *   - Nodes as filled circles with white stroke + labels
 *   - Edges as lines between node centres
 *   - Optional highlighted route (polyline) + waypoint markers
 *   - Selected node highlighted in red
 *   - User position as a pulsing red dot
 *   - Pan / pinch-zoom / double-tap
 *   - Compass rose
 *
 * Coordinate system: origin top-left, 1 map unit = mScale px.
 */
public class MapView extends View {

    private static final float NODE_RADIUS   = 8f;
    private static final float SELECTED_R    = 12f;
    private static final float USER_RADIUS   = 10f;
    private static final float EDGE_WIDTH    = 2f;
    private static final float ROUTE_WIDTH   = 4f;
    private static final float LABEL_SIZE    = 10f;
    private static final float COMPASS_SIZE  = 44f;
    private static final float PADDING       = 16f;
    private static final float MIN_SCALE     = 0.05f;
    private static final float MAX_SCALE     = 20f;

    private MapResponse mapData;
    private int userX = -1, userY = -1, userFloor = -1;
    private String selectedNodeId = null;
    private List<Router.Step> route = null;

    private float mScale = 2.0f;
    private float mTranslateX = PADDING;
    private float mTranslateY = PADDING;
    private boolean userHasInteracted = false;
    private float lastTouchX, lastTouchY;
    private int activePointerId = MotionEvent.INVALID_POINTER_ID;

    private ScaleGestureDetector scaleDetector;
    private GestureDetector gestureDetector;

    private android.animation.ValueAnimator haloAnimator;
    private float haloRadiusMult = 0f;
    private float haloAlphaMult  = 0f;

    private final Map<String, float[]> nodeCentres = new HashMap<>();

    private final Paint edgePaint    = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint routePaint   = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint nodePaint    = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint nodeStroke   = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint selPaint     = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint labelPaint   = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint userPaint    = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint userStroke   = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint userHalo     = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint compassRing  = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint northPaint   = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint southPaint   = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint compassLabel = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint bgPaint      = new Paint();
    private final Paint gridPaint    = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint hintPaint    = new Paint(Paint.ANTI_ALIAS_FLAG);

    public MapView(Context context) { super(context); init(); }
    public MapView(Context context, AttributeSet attrs) { super(context, attrs); init(); }
    public MapView(Context context, AttributeSet attrs, int defStyleAttr) { super(context, attrs, defStyleAttr); init(); }

    private void init() {
        float density = getResources().getDisplayMetrics().density;

        edgePaint.setStyle(Paint.Style.STROKE);
        edgePaint.setColor(Color.parseColor("#90A4AE"));
        edgePaint.setStrokeWidth(EDGE_WIDTH * density);
        edgePaint.setStrokeCap(Paint.Cap.ROUND);

        routePaint.setStyle(Paint.Style.STROKE);
        routePaint.setColor(Color.parseColor("#D32F2F"));
        routePaint.setStrokeWidth(ROUTE_WIDTH * density);
        routePaint.setStrokeCap(Paint.Cap.ROUND);
        routePaint.setStrokeJoin(Paint.Join.ROUND);
        android.graphics.DashPathEffect dash = new android.graphics.DashPathEffect(new float[]{10f * density, 6f * density}, 0);
        routePaint.setPathEffect(dash);

        nodePaint.setStyle(Paint.Style.FILL);
        nodePaint.setColor(Color.parseColor("#1565C0"));

        nodeStroke.setStyle(Paint.Style.STROKE);
        nodeStroke.setColor(Color.WHITE);
        nodeStroke.setStrokeWidth(2f * density);

        selPaint.setStyle(Paint.Style.FILL);
        selPaint.setColor(Color.parseColor("#D32F2F"));

        labelPaint.setStyle(Paint.Style.FILL);
        labelPaint.setColor(Color.parseColor("#455A64"));
        labelPaint.setTextSize(LABEL_SIZE * density);
        labelPaint.setTextAlign(Paint.Align.CENTER);
        labelPaint.setShadowLayer(2f, 0f, 0f, Color.WHITE);

        userPaint.setStyle(Paint.Style.FILL);
        userPaint.setColor(Color.parseColor("#D32F2F"));

        userStroke.setStyle(Paint.Style.STROKE);
        userStroke.setColor(Color.WHITE);
        userStroke.setStrokeWidth(2f * density);

        userHalo.setStyle(Paint.Style.FILL);
        userHalo.setColor(Color.parseColor("#D32F2F"));

        initHaloAnimator();

        compassRing.setStyle(Paint.Style.STROKE);
        compassRing.setColor(Color.parseColor("#BDBDBD"));
        compassRing.setStrokeWidth(1.5f);

        northPaint.setStyle(Paint.Style.FILL);
        northPaint.setColor(Color.parseColor("#D32F2F"));

        southPaint.setStyle(Paint.Style.FILL);
        southPaint.setColor(Color.parseColor("#9E9E9E"));

        compassLabel.setStyle(Paint.Style.FILL);
        compassLabel.setColor(Color.parseColor("#212121"));
        compassLabel.setTextSize(12f * density);
        compassLabel.setTextAlign(Paint.Align.CENTER);

        bgPaint.setStyle(Paint.Style.FILL);
        bgPaint.setColor(Color.parseColor("#F5F5F5"));

        gridPaint.setStyle(Paint.Style.STROKE);
        gridPaint.setColor(Color.parseColor("#E0E0E0"));
        gridPaint.setStrokeWidth(1f);

        hintPaint.setStyle(Paint.Style.FILL);
        hintPaint.setColor(Color.parseColor("#BDBDBD"));
        hintPaint.setTextSize(14f * density);
        hintPaint.setTextAlign(Paint.Align.CENTER);

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
                });
    }

    public void setMapData(MapResponse data) {
        this.mapData = data;
        this.userHasInteracted = false;
        recalculateDimensions();
        invalidate();
    }

    public void setUserPosition(int x, int y, int floor) {
        this.userX = x; this.userY = y; this.userFloor = floor;
        invalidate();
    }

    public void setSelectedNode(String nodeId) {
        this.selectedNodeId = nodeId;
        invalidate();
    }

    public void setRoute(List<Router.Step> route) {
        this.route = route;
        invalidate();
    }

    /** Clear selection + route. */
    public void clearSelection() {
        this.selectedNodeId = null;
        this.route = null;
        invalidate();
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
            canvas.drawText("Fetching map…", getWidth() / 2f, getHeight() / 2f, hintPaint);
            drawCompass(canvas);
            return;
        }

        drawEdges(canvas);
        if (route != null) drawRoute(canvas);
        drawNodes(canvas);
        drawUserPosition(canvas);
        drawCompass(canvas);
    }

    private void drawGrid(Canvas canvas) {
        float w = getWidth(), h = getHeight();
        float step = 40f;
        for (float x = 0; x <= w; x += step) canvas.drawLine(x, 0, x, h, gridPaint);
        for (float y = 0; y <= h; y += step) canvas.drawLine(0, y, w, y, gridPaint);
    }

    private void drawEdges(Canvas canvas) {
        if (mapData.edges == null) return;
        // Build a set of route edges to skip drawing them normally (they draw in route pass)
        if (route == null) {
            for (MapEdge edge : mapData.edges) {
                float[] from = nodeCentres.get(edge.fromNode);
                float[] to   = nodeCentres.get(edge.toNode);
                if (from == null || to == null) continue;
                canvas.drawLine(from[0], from[1], to[0], to[1], edgePaint);
            }
        } else {
            // Only draw non-route edges faintly
            for (MapEdge edge : mapData.edges) {
                if (isRouteEdge(edge)) continue;
                float[] from = nodeCentres.get(edge.fromNode);
                float[] to   = nodeCentres.get(edge.toNode);
                if (from == null || to == null) continue;
                edgePaint.setAlpha(90);
                canvas.drawLine(from[0], from[1], to[0], to[1], edgePaint);
                edgePaint.setAlpha(255);
            }
        }
    }

    private boolean isRouteEdge(MapEdge edge) {
        if (route == null || route.size() < 2) return false;
        for (int i = 0; i < route.size() - 1; i++) {
            String a = route.get(i).nodeId;
            String b = route.get(i + 1).nodeId;
            if ((edge.fromNode.equals(a) && edge.toNode.equals(b))
                    || (edge.fromNode.equals(b) && edge.toNode.equals(a))) {
                return true;
            }
        }
        return false;
    }

    private void drawRoute(Canvas canvas) {
        if (route == null || route.size() < 2) return;
        Path path = new Path();
        boolean first = true;
        for (Router.Step step : route) {
            float[] c = nodeCentres.get(step.nodeId);
            if (c == null) continue;
            if (first) { path.moveTo(c[0], c[1]); first = false; }
            else path.lineTo(c[0], c[1]);
        }
        canvas.drawPath(path, routePaint);
        // Draw waypoint dots at intermediate nodes
        float density = getResources().getDisplayMetrics().density;
        for (int i = 1; i < route.size() - 1; i++) {
            float[] c = nodeCentres.get(route.get(i).nodeId);
            if (c == null) continue;
            canvas.drawCircle(c[0], c[1], 5f * density, routePaint);
        }
    }

    private void drawNodes(Canvas canvas) {
        if (mapData.nodes == null) return;
        float density = getResources().getDisplayMetrics().density;
        float nodeR = NODE_RADIUS * density;

        for (MapNode node : mapData.nodes) {
            float[] centre = nodeCentres.get(node.nodeId);
            if (centre == null) continue;

            boolean selected = selectedNodeId != null && selectedNodeId.equals(node.nodeId);
            boolean onRoute = route != null && routeContains(node.nodeId);

            if (selected) {
                canvas.drawCircle(centre[0], centre[1], SELECTED_R * density, selPaint);
                canvas.drawCircle(centre[0], centre[1], SELECTED_R * density, nodeStroke);
            } else if (onRoute) {
                canvas.drawCircle(centre[0], centre[1], nodeR, selPaint);
                canvas.drawCircle(centre[0], centre[1], nodeR, nodeStroke);
            } else {
                canvas.drawCircle(centre[0], centre[1], nodeR, nodePaint);
                canvas.drawCircle(centre[0], centre[1], nodeR, nodeStroke);
            }

            String label = (node.name != null && !node.name.isEmpty()) ? node.name : node.nodeId;
            canvas.drawText(label, centre[0], centre[1] + (selected ? SELECTED_R : nodeR)
                    + labelPaint.getTextSize() + 2, labelPaint);
        }
    }

    private boolean routeContains(String nodeId) {
        if (route == null) return false;
        for (Router.Step s : route) if (s.nodeId.equals(nodeId)) return true;
        return false;
    }

    private void initHaloAnimator() {
        haloAnimator = android.animation.ValueAnimator.ofFloat(0f, 1f);
        haloAnimator.setDuration(1500);
        haloAnimator.setRepeatCount(android.animation.ValueAnimator.INFINITE);
        haloAnimator.setInterpolator(new android.view.animation.LinearInterpolator());
        haloAnimator.addUpdateListener(animation -> {
            float v = (float) animation.getAnimatedValue();
            haloRadiusMult = v;
            haloAlphaMult  = 1f - v;
            invalidate();
        });
    }

    @Override protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        if (haloAnimator != null && !haloAnimator.isRunning()) haloAnimator.start();
    }
    @Override protected void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        if (haloAnimator != null) haloAnimator.cancel();
    }
    @Override protected void onVisibilityChanged(android.view.View changedView, int visibility) {
        super.onVisibilityChanged(changedView, visibility);
        if (haloAnimator == null) return;
        if (visibility == View.VISIBLE) { if (!haloAnimator.isRunning()) haloAnimator.start(); }
        else haloAnimator.cancel();
    }

    private void drawUserPosition(Canvas canvas) {
        if (userX < 0 || userY < 0) return;
        float density = getResources().getDisplayMetrics().density;
        float cx = toCanvasX(userX), cy = toCanvasY(userY);
        if (haloAlphaMult > 0) {
            float rStart = 14f * density, rEnd = 26f * density;
            float r = rStart + (rEnd - rStart) * haloRadiusMult;
            userHalo.setAlpha((int) (haloAlphaMult * 80));
            canvas.drawCircle(cx, cy, r, userHalo);
        }
        canvas.drawCircle(cx, cy, USER_RADIUS * density, userPaint);
        canvas.drawCircle(cx, cy, USER_RADIUS * density, userStroke);
    }

    private void drawCompass(Canvas canvas) {
        float cx = getWidth() - PADDING - COMPASS_SIZE;
        float cy = PADDING + COMPASS_SIZE;
        float r = COMPASS_SIZE * 0.6f;
        canvas.drawCircle(cx, cy, r, compassRing);

        Path north = new Path();
        north.moveTo(cx, cy - r);
        north.lineTo(cx - r * 0.22f, cy);
        north.lineTo(cx + r * 0.22f, cy);
        north.close();
        canvas.drawPath(north, northPaint);

        Path south = new Path();
        south.moveTo(cx, cy + r);
        south.lineTo(cx - r * 0.22f, cy);
        south.lineTo(cx + r * 0.22f, cy);
        south.close();
        canvas.drawPath(south, southPaint);

        canvas.drawText("N", cx, cy - r - 4, compassLabel);
    }

    @Override protected void onSizeChanged(int w, int h, int oldw, int oldh) {
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
        if (userHasInteracted) { rebuildNodeCentres(); return; }
        int w = getWidth(), h = getHeight();
        if (w <= 0 || h <= 0 || mapData == null || mapData.nodes == null || mapData.nodes.isEmpty()) {
            mScale = 2.0f; mTranslateX = PADDING; mTranslateY = PADDING;
            rebuildNodeCentres(); return;
        }
        int minX = Integer.MAX_VALUE, maxX = Integer.MIN_VALUE;
        int minY = Integer.MAX_VALUE, maxY = Integer.MIN_VALUE;
        for (MapNode node : mapData.nodes) {
            if (node.x < minX) minX = node.x;
            if (node.x > maxX) maxX = node.x;
            if (node.y < minY) minY = node.y;
            if (node.y > maxY) maxY = node.y;
        }
        float mapWidth = maxX - minX; if (mapWidth <= 0) mapWidth = 1f;
        float mapHeight = maxY - minY; if (mapHeight <= 0) mapHeight = 1f;
        float padding = 24f;
        float scaleX = (w - 2 * padding) / mapWidth;
        float scaleY = (h - 2 * padding) / mapHeight;
        mScale = Math.min(scaleX, scaleY);
        float scaledW = mapWidth * mScale, scaledH = mapHeight * mScale;
        mTranslateX = (w - scaledW) / 2f - minX * mScale;
        mTranslateY = (h - scaledH) / 2f - minY * mScale;
        rebuildNodeCentres();
    }
}
