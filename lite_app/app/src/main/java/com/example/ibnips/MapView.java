package com.example.ibnips;

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

import java.util.HashMap;
import java.util.Map;

/**
 * Custom View that renders the indoor floor map from a MapResponse.
 *
 * Coordinate system:
 *   - Origin (0,0) is at the top-left of the canvas
 *   - 1 map unit = SCALE px (default 2)
 *   - Nodes are drawn as circles; edges as lines between node centres
 *   - User position rendered as a distinct red circle
 *   - Compass rose drawn in the top-right corner
 *
 * Thread safety: setMapData() and setUserPosition() call invalidate(), which
 * must be called on the UI thread. Use runOnUiThread() if updating from a
 * background thread.
 */
public class MapView extends View {

    // ------------------------------------------------------------------
    // Constants
    // ------------------------------------------------------------------
    private static final float NODE_RADIUS  = 8f;    // dp-ish (scaled below)
    private static final float USER_RADIUS  = 10f;   // dp-ish
    private static final float EDGE_WIDTH   = 1.5f;  // px
    private static final float LABEL_SIZE   = 9f;    // sp
    private static final float COMPASS_SIZE = 48f;   // px half-size
    private static final float PADDING      = 16f;   // px from edge
    private static final float MIN_SCALE    = 0.05f;
    private static final float MAX_SCALE    = 20f;

    // ------------------------------------------------------------------
    // State
    // ------------------------------------------------------------------
    private MapResponse mapData   = null;
    private int         userX     = -1;
    private int         userY     = -1;
    private int         userFloor = -1;

    private float       mScale      = 2.0f; // dynamic map units → pixels
    private float       mTranslateX = PADDING;
    private float       mTranslateY = PADDING;

    private boolean userHasInteracted = false;
    private float lastTouchX;
    private float lastTouchY;
    private int activePointerId = MotionEvent.INVALID_POINTER_ID;

    private ScaleGestureDetector scaleDetector;
    private GestureDetector gestureDetector;

    private android.animation.ValueAnimator haloAnimator;
    private float haloRadiusMult = 0f;
    private float haloAlphaMult  = 0f;

    /** Pre-computed canvas coordinates per nodeId. */
    private final Map<String, float[]> nodeCentres = new HashMap<>();

    // ------------------------------------------------------------------
    // Paints (allocated once — avoids GC pressure in onDraw)
    // ------------------------------------------------------------------
    private final Paint edgePaint    = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint nodePaint    = new Paint(Paint.ANTI_ALIAS_FLAG);
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
    private final Paint nodeStroke   = new Paint(Paint.ANTI_ALIAS_FLAG);

    // ------------------------------------------------------------------
    // Constructors
    // ------------------------------------------------------------------

    public MapView(Context context) {
        super(context);
        init();
    }

    public MapView(Context context, AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    public MapView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init();
    }

    private void init() {
        float density = getResources().getDisplayMetrics().density;

        edgePaint.setStyle(Paint.Style.STROKE);
        edgePaint.setColor(Color.parseColor("#90A4AE")); // Blue-grey
        edgePaint.setStrokeWidth(2f * density);
        edgePaint.setStrokeCap(Paint.Cap.ROUND);

        nodePaint.setStyle(Paint.Style.FILL);
        nodePaint.setColor(Color.parseColor("#1565C0")); // Material Blue 800

        nodeStroke.setStyle(Paint.Style.STROKE);
        nodeStroke.setColor(Color.WHITE);
        nodeStroke.setStrokeWidth(2f * density);

        labelPaint.setStyle(Paint.Style.FILL);
        labelPaint.setColor(Color.parseColor("#455A64"));
        labelPaint.setTextSize(LABEL_SIZE * density);
        labelPaint.setTextAlign(Paint.Align.CENTER);
        labelPaint.setShadowLayer(3f, 0f, 0f, Color.WHITE); // White halo for readability

        userPaint.setStyle(Paint.Style.FILL);
        userPaint.setColor(Color.parseColor("#D32F2F")); // Material Red 700

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
                    @Override
                    public boolean onScale(ScaleGestureDetector detector) {
                        zoomAround(detector.getFocusX(), detector.getFocusY(),
                                detector.getScaleFactor());
                        return true;
                    }
                });

        gestureDetector = new GestureDetector(getContext(),
                new GestureDetector.SimpleOnGestureListener() {
                    @Override
                    public boolean onDoubleTap(MotionEvent e) {
                        zoomAround(e.getX(), e.getY(), 1.8f);
                        return true;
                    }
                });
    }

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    /** Replace the map data and trigger a redraw. */
    public void setMapData(MapResponse data) {
        this.mapData = data;
        this.userHasInteracted = false;
        recalculateDimensions();
        invalidate();
    }

    /**
     * Update the user position dot.
     * Pass floor = -1 to hide the dot.
     */
    public void setUserPosition(int x, int y, int floor) {
        this.userX     = x;
        this.userY     = y;
        this.userFloor = floor;
        invalidate();
    }

    /**
     * Update the user position dot with a smooth animation.
     * Pass floor = -1 to hide the dot.
     */
    public void setUserPositionAnimated(int x, int y, int floor) {
        if (userX < 0 || userY < 0 || userFloor != floor) {
            // If no current position or floor changes, jump directly
            setUserPosition(x, y, floor);
            return;
        }

        // Animate from current position to new position
        float startX = userX;
        float startY = userY;
        android.animation.ValueAnimator animator = android.animation.ValueAnimator.ofFloat(0f, 1f);
        animator.setDuration(600);
        animator.setInterpolator(new android.view.animation.DecelerateInterpolator());
        animator.addUpdateListener(animation -> {
            float fraction = (float) animation.getAnimatedValue();
            int currentX = (int) (startX + (x - startX) * fraction);
            int currentY = (int) (startY + (y - startY) * fraction);
            setUserPosition(currentX, currentY, floor);
        });
        animator.start();
    }

    // ------------------------------------------------------------------
    // Touch: pan / pinch-zoom / double-tap
    // ------------------------------------------------------------------

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        scaleDetector.onTouchEvent(event);
        gestureDetector.onTouchEvent(event);

        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN: {
                lastTouchX = event.getX();
                lastTouchY = event.getY();
                activePointerId = event.getPointerId(0);
                break;
            }
            case MotionEvent.ACTION_MOVE: {
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
            }
            case MotionEvent.ACTION_POINTER_UP: {
                int pointerIndex = event.getActionIndex();
                int pointerId = event.getPointerId(pointerIndex);
                if (pointerId == activePointerId) {
                    int newIndex = pointerIndex == 0 ? 1 : 0;
                    lastTouchX = event.getX(newIndex);
                    lastTouchY = event.getY(newIndex);
                    activePointerId = event.getPointerId(newIndex);
                }
                break;
            }
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_CANCEL: {
                activePointerId = MotionEvent.INVALID_POINTER_ID;
                break;
            }
            default:
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

    // ------------------------------------------------------------------
    // Rendering
    // ------------------------------------------------------------------

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        canvas.drawRect(0, 0, getWidth(), getHeight(), bgPaint);

        drawGrid(canvas);

        if (mapData == null) {
            canvas.drawText(
                    "Tap \"Fetch Map\" to load floor plan",
                    getWidth() / 2f,
                    getHeight() / 2f,
                    hintPaint
            );
            drawCompass(canvas);
            return;
        }

        drawEdges(canvas);
        drawNodes(canvas);
        drawUserPosition(canvas);
        drawCompass(canvas);
    }

    private void drawGrid(Canvas canvas) {
        float w = getWidth();
        float h = getHeight();
        float step = 40f;

        for (float x = 0; x <= w; x += step) {
            canvas.drawLine(x, 0, x, h, gridPaint);
        }
        for (float y = 0; y <= h; y += step) {
            canvas.drawLine(0, y, w, y, gridPaint);
        }
    }

    private void drawEdges(Canvas canvas) {
        if (mapData.edges == null) return;
        for (MapEdge edge : mapData.edges) {
            float[] from = nodeCentres.get(edge.fromNode);
            float[] to   = nodeCentres.get(edge.toNode);
            if (from == null || to == null) continue;
            canvas.drawLine(from[0], from[1], to[0], to[1], edgePaint);
        }
    }

    private void drawNodes(Canvas canvas) {
        if (mapData.nodes == null) return;
        float density = getResources().getDisplayMetrics().density;
        float nodeR   = NODE_RADIUS * density;

        for (MapNode node : mapData.nodes) {
            float[] centre = nodeCentres.get(node.nodeId);
            if (centre == null) continue;
            canvas.drawCircle(centre[0], centre[1], nodeR, nodePaint);
            canvas.drawCircle(centre[0], centre[1], nodeR, nodeStroke);

            String label = (node.name != null && !node.name.isEmpty()) ? node.name : node.nodeId;
            canvas.drawText(
                    label,
                    centre[0],
                    centre[1] + nodeR + labelPaint.getTextSize() + 2,
                    labelPaint
            );
        }
    }

    private void initHaloAnimator() {
        haloAnimator = android.animation.ValueAnimator.ofFloat(0f, 1f);
        haloAnimator.setDuration(1500);
        haloAnimator.setRepeatCount(android.animation.ValueAnimator.INFINITE);
        haloAnimator.setInterpolator(new android.view.animation.LinearInterpolator());
        haloAnimator.addUpdateListener(animation -> {
            float v = (float) animation.getAnimatedValue();
            haloRadiusMult = v;      // 0 -> 1
            haloAlphaMult  = 1f - v; // 1 -> 0
            invalidate();
        });
    }

    @Override
    protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        if (haloAnimator != null && !haloAnimator.isRunning()) {
            haloAnimator.start();
        }
    }

    @Override
    protected void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        if (haloAnimator != null) {
            haloAnimator.cancel();
        }
    }

    @Override
    protected void onVisibilityChanged(android.view.View changedView, int visibility) {
        super.onVisibilityChanged(changedView, visibility);
        if (haloAnimator == null) return;
        if (visibility == android.view.View.VISIBLE) {
            if (!haloAnimator.isRunning()) haloAnimator.start();
        } else {
            haloAnimator.cancel();
        }
    }

    private void drawUserPosition(Canvas canvas) {
        if (userX < 0 || userY < 0) return;
        float density = getResources().getDisplayMetrics().density;
        float cx = toCanvasX(userX);
        float cy = toCanvasY(userY);

        // Halo
        if (haloAlphaMult > 0) {
            float rStart = 14f * density;
            float rEnd = 26f * density;
            float r = rStart + (rEnd - rStart) * haloRadiusMult;
            userHalo.setAlpha((int) (haloAlphaMult * 80)); // Max alpha 80/255
            canvas.drawCircle(cx, cy, r, userHalo);
        }

        // Inner dot + white stroke
        canvas.drawCircle(cx, cy, USER_RADIUS * density, userPaint);
        canvas.drawCircle(cx, cy, USER_RADIUS * density, userStroke);
    }

    private void drawCompass(Canvas canvas) {
        float cx = getWidth()  - PADDING - COMPASS_SIZE;
        float cy = PADDING     + COMPASS_SIZE;
        float r  = COMPASS_SIZE * 0.6f;

        canvas.drawCircle(cx, cy, r, compassRing);

        // North triangle (red, pointing up)
        Path north = new Path();
        north.moveTo(cx,          cy - r);
        north.lineTo(cx - r * 0.22f, cy);
        north.lineTo(cx + r * 0.22f, cy);
        north.close();
        canvas.drawPath(north, northPaint);

        // South triangle (grey, pointing down)
        Path south = new Path();
        south.moveTo(cx,          cy + r);
        south.lineTo(cx - r * 0.22f, cy);
        south.lineTo(cx + r * 0.22f, cy);
        south.close();
        canvas.drawPath(south, southPaint);

        // "N" label just above the circle
        canvas.drawText("N", cx, cy - r - 4, compassLabel);
    }

    @Override
    protected void onSizeChanged(int w, int h, int oldw, int oldh) {
        super.onSizeChanged(w, h, oldw, oldh);
        recalculateDimensions();
    }

    // ------------------------------------------------------------------
    // Coordinate helpers
    // ------------------------------------------------------------------

    private float toCanvasX(int mapX) { return mapX * mScale + mTranslateX; }
    private float toCanvasY(int mapY) { return mapY * mScale + mTranslateY; }

    /** Rebuild the nodeId → canvas-centre lookup after map data changes. */
    private void rebuildNodeCentres() {
        nodeCentres.clear();
        if (mapData == null || mapData.nodes == null) return;
        for (MapNode node : mapData.nodes) {
            nodeCentres.put(node.nodeId, new float[]{toCanvasX(node.x), toCanvasY(node.y)});
        }
    }

    /** Compute the dynamic scale and translations to fit-to-screen. */
    private void recalculateDimensions() {
        if (userHasInteracted) {
            rebuildNodeCentres();
            return;
        }

        int w = getWidth();
        int h = getHeight();
        if (w <= 0 || h <= 0 || mapData == null || mapData.nodes == null || mapData.nodes.isEmpty()) {
            mScale = 2.0f;
            mTranslateX = PADDING;
            mTranslateY = PADDING;
            rebuildNodeCentres();
            return;
        }

        int minX = Integer.MAX_VALUE;
        int maxX = Integer.MIN_VALUE;
        int minY = Integer.MAX_VALUE;
        int maxY = Integer.MIN_VALUE;

        for (MapNode node : mapData.nodes) {
            if (node.x < minX) minX = node.x;
            if (node.x > maxX) maxX = node.x;
            if (node.y < minY) minY = node.y;
            if (node.y > maxY) maxY = node.y;
        }

        float mapWidth = maxX - minX;
        float mapHeight = maxY - minY;

        if (mapWidth <= 0) mapWidth = 1f;
        if (mapHeight <= 0) mapHeight = 1f;

        float padding = 24f; // 24px padding on every side
        float availableWidth = w - 2 * padding;
        float availableHeight = h - 2 * padding;

        float scaleX = availableWidth / mapWidth;
        float scaleY = availableHeight / mapHeight;
        mScale = Math.min(scaleX, scaleY);

        float scaledMapWidth = mapWidth * mScale;
        float scaledMapHeight = mapHeight * mScale;

        mTranslateX = (w - scaledMapWidth) / 2f - minX * mScale;
        mTranslateY = (h - scaledMapHeight) / 2f - minY * mScale;

        rebuildNodeCentres();
    }
}
