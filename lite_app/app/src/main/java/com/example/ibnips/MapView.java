package com.example.ibnips;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.util.AttributeSet;
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
    private static final float SCALE        = 2.0f;  // map units → pixels
    private static final float NODE_RADIUS  = 8f;    // dp-ish (scaled below)
    private static final float USER_RADIUS  = 10f;   // dp-ish
    private static final float EDGE_WIDTH   = 1.5f;  // px
    private static final float LABEL_SIZE   = 9f;    // sp
    private static final float COMPASS_SIZE = 48f;   // px half-size
    private static final float PADDING      = 16f;   // px from edge

    // ------------------------------------------------------------------
    // State
    // ------------------------------------------------------------------
    private MapResponse mapData   = null;
    private int         userX     = -1;
    private int         userY     = -1;
    private int         userFloor = -1;

    /** Pre-computed canvas coordinates per nodeId. */
    private final Map<String, float[]> nodeCentres = new HashMap<>();

    // ------------------------------------------------------------------
    // Paints (allocated once — avoids GC pressure in onDraw)
    // ------------------------------------------------------------------
    private final Paint edgePaint    = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint nodePaint    = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint labelPaint   = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint userPaint    = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint compassRing  = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint northPaint   = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint southPaint   = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint compassLabel = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint bgPaint      = new Paint();
    private final Paint hintPaint    = new Paint(Paint.ANTI_ALIAS_FLAG);

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
        edgePaint.setColor(Color.parseColor("#333333"));
        edgePaint.setStrokeWidth(EDGE_WIDTH);

        nodePaint.setStyle(Paint.Style.FILL);
        nodePaint.setColor(Color.parseColor("#1565C0")); // Material Blue 800

        labelPaint.setStyle(Paint.Style.FILL);
        labelPaint.setColor(Color.parseColor("#212121"));
        labelPaint.setTextSize(LABEL_SIZE * density);
        labelPaint.setTextAlign(Paint.Align.CENTER);

        userPaint.setStyle(Paint.Style.FILL);
        userPaint.setColor(Color.parseColor("#D32F2F")); // Material Red 700

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
        bgPaint.setColor(Color.parseColor("#FAFAFA"));

        hintPaint.setStyle(Paint.Style.FILL);
        hintPaint.setColor(Color.parseColor("#BDBDBD"));
        hintPaint.setTextSize(14f * density);
        hintPaint.setTextAlign(Paint.Align.CENTER);
    }

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    /** Replace the map data and trigger a redraw. */
    public void setMapData(MapResponse data) {
        this.mapData = data;
        rebuildNodeCentres();
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

    // ------------------------------------------------------------------
    // Rendering
    // ------------------------------------------------------------------

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        canvas.drawRect(0, 0, getWidth(), getHeight(), bgPaint);

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

            String label = (node.name != null && !node.name.isEmpty()) ? node.name : node.nodeId;
            canvas.drawText(
                    label,
                    centre[0],
                    centre[1] + nodeR + labelPaint.getTextSize() + 2,
                    labelPaint
            );
        }
    }

    private void drawUserPosition(Canvas canvas) {
        if (userX < 0 || userY < 0) return;
        float density = getResources().getDisplayMetrics().density;
        canvas.drawCircle(
                toCanvasX(userX),
                toCanvasY(userY),
                USER_RADIUS * density,
                userPaint
        );
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

    // ------------------------------------------------------------------
    // Coordinate helpers
    // ------------------------------------------------------------------

    private float toCanvasX(int mapX) { return mapX * SCALE + PADDING; }
    private float toCanvasY(int mapY) { return mapY * SCALE + PADDING; }

    /** Rebuild the nodeId → canvas-centre lookup after map data changes. */
    private void rebuildNodeCentres() {
        nodeCentres.clear();
        if (mapData == null || mapData.nodes == null) return;
        for (MapNode node : mapData.nodes) {
            nodeCentres.put(node.nodeId, new float[]{toCanvasX(node.x), toCanvasY(node.y)});
        }
    }
}
