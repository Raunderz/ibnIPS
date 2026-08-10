# ibnIPS Android App Build Guide
## AI-Agent Oriented (Delegate to Claude)

This guide is structured for giving to an AI agent. Each section is a self-contained task you can copy-paste into a chat and get working code back.

---

## Project Overview

**What you're building:**
- Minimal Java Android app (~400KB APK)
- Scans Wi-Fi networks (SSID, BSSID, RSSI in dBm)
- Sends JSON to Go backend
- Receives position JSON (x, y, floor, map geometry)
- Renders floor map with user dot on Canvas
- Shows compass direction (8-way: N, NE, E, SE, S, SW, W, NW)

**Backend endpoint:** `http://localhost:3000/api` (see schema below)

**Target device:** Android 8.0+ (API 26+)

**No external libraries.** Use only:
- `android.*` framework (built-in)
- `java.*` standard library
- `org.json` (bundled with Android)
- `HttpURLConnection` (built-in)

---

## Phase 1: Project Setup

### Task 1.1 — Create minimal Gradle build config

**Input to Claude:**
```
I'm building a minimal Android app (Java, no Kotlin, no AndroidX). 
Create a build.gradle file with:
- minSdk 26
- targetSdk 34
- NO external dependencies (only framework)
- R8 code shrinking enabled for release builds
- output: app-release.apk

Target: Android app module, not a library.
```

**What you get back:** `build.gradle` (~40 lines)

---

### Task 1.2 — AndroidManifest.xml with permissions

**Input to Claude:**
```
Create an AndroidManifest.xml for:
- App name: ibnIPS
- Package: com.example.ibnips
- MainActivity as launcher
- Permissions needed: 
  * ACCESS_FINE_LOCATION (for Wi-Fi scanning)
  * CHANGE_WIFI_STATE (to scan networks)
  * INTERNET (for backend calls)
  * ACCESS_NETWORK_STATE (to check connectivity)
- Runtime permission handling (target API 26+)
- No Google Play Services, no AndroidX
```

**What you get back:** `AndroidManifest.xml` (~35 lines)

---

## Phase 2: Core Data Models

### Task 2.1 — Create Wi-Fi scan data class

**Input to Claude:**
```
Create a Java class WifiScanResult:
- Fields: bssid (String), ssid (String), rssi (int)
- Methods: toJSON() → JSONObject, fromJSON(JSONObject) static factory
- No external libraries, use org.json only

Example:
WifiScanResult scan = new WifiScanResult("aa:bb:cc:dd:ee:ff", "IITB-WiFi", -65);
JSONObject json = scan.toJSON();
```

**What you get back:** `WifiScanResult.java` (~30 lines)

---

### Task 2.2 — Create backend response model

**Input to Claude:**
```
Create Java classes for backend responses:

1. MapResponse:
   - nodes: List<MapNode>
   - edges: List<MapEdge>
   - fromJSON(JSONObject) static factory

2. MapNode:
   - nodeId, name, floor (int), x (int), y (int)
   - All fields public

3. MapEdge:
   - fromNode, toNode (Strings), steps (int), direction (String)
   - All fields public

4. PositionResponse:
   - x (int), y (int), floor (int)
   - fromJSON(JSONObject) static factory

Use org.json. No external libraries.
```

**What you get back:** 3 Java files (~80 lines total)

---

## Phase 3: Backend Communication

### Task 3.1 — HTTP client for backend

**Input to Claude:**
```
Create HttpBackendClient class:

Methods:
1. authenticate(email) → String token
   - POST to http://localhost:3000/api/auth
   - Body: {"email":"user@iitb.ac.in"}
   - Returns: token from response

2. ping(token, nodeName, floor, previousNodeId, steps, direction, wifiScans) → String nodeId
   - POST to http://localhost:3000/api/ping
   - Bearer token in Authorization header
   - Body: JSON per backend schema
   - Returns: node_id from response

3. getMap(token) → MapResponse
   - GET http://localhost:3000/api/map
   - Bearer token in Authorization header
   - Returns: MapResponse object

4. fetchPosition(token, wifiScans) → PositionResponse
   - POST to http://localhost:3000/api/position
   - Bearer token in Authorization header
   - Body: {"fingerprints": [{"bssid":"...", "ssid":"...", "rssi":-65}]}
   - Returns: PositionResponse (x, y, floor, node_id, name)

Use only HttpURLConnection, org.json.
Handle errors: log exception, return null or throw.
```

**What you get back:** `HttpBackendClient.java` (~130 lines)

---

### Task 3.2 — Locate Me & Positioning

**Input to Claude:**
```
Implement "Locate Me" functionality:
1. PositionResponse model with fields: x, y, floor, nodeId, name.
2. "Locate Me" button in main.xml overlay.
3. onLocateMeClicked() in MainActivity:
   - Scans Wi-Fi networks.
   - Calls backend POST /api/position with current fingerprints.
   - Updates MapView user dot (x, y, floor).
   - Displays "Current location: <Location Name>" in UI status label.
```

---

## Phase 4: Wi-Fi Scanning

### Task 4.1 — Wi-Fi scanner service

**Input to Claude:**
```
Create WifiScanner class (static helper, no instance):

Methods:
1. startScan(context) → boolean
   - Call WifiManager.startScan()
   - Return true if scan initiated
   - Handle SecurityException (permissions not granted)

2. getLastScanResults(context) → List<WifiScanResult>
   - Call WifiManager.getScanResults()
   - Filter: keep BSSID + RSSI, extract SSID
   - Convert to List<WifiScanResult>
   - Handle SecurityException
   - Return empty list if no results

3. requestLocationPermissions(activity)
   - (Optional for now; we'll wire this into MainActivity later)

Use android.net.wifi.WifiManager only.
No external libraries.
Handle null results gracefully.
```

**What you get back:** `WifiScanner.java` (~70 lines)

---

## Phase 5: UI & Rendering

### Task 5.1 — Custom Canvas view for map rendering

**Input to Claude:**
```
Create MapView extends View:

Purpose: Render floor map from MapResponse.

Fields:
- mapData: MapResponse (null = blank screen)
- userX, userY: current user position
- userFloor: current floor

Public methods:
1. setMapData(MapResponse data)
   - Store data, invalidate()

2. setUserPosition(int x, int y, int floor)
   - Store position, invalidate()

3. onDraw(Canvas canvas)
   - Draw all MapEdges as black lines (1px width)
   - Draw all MapNodes as circles (radius 8px, blue fill)
   - Draw node labels (SSID, 10px text, below node)
   - Draw user position as red circle (radius 5px)
   - Draw compass rose in corner (N arrow pointing up)
   - Pan/zoom: for now, assume 1 unit = 2px, origin (0,0) at top-left
   - Don't worry about fancy transforms yet

Constructor:
- Context, AttributeSet

Use only android.graphics (Canvas, Paint, Color).
No external libraries.
```

**What you get back:** `MapView.java` (~150 lines)

---

### Task 5.2 — Main activity layout XML

**Input to Claude:**
```
Create res/layout/main.xml (FrameLayout):

Layout hierarchy:
- MapView (fill parent)
- Overlay at bottom:
  * Horizontal LinearLayout (white bg, padding 8dp)
  * Left side: vertical layout
    - Button "Scan" (blue, match_parent width)
    - Button "Ping" (green, match_parent width)
    - Button "Fetch Map" (orange, match_parent width)
  * Right side: vertical layout
    - TextView "Status:" (12sp text)
    - EditText (single line, hint "Room name")
    - Spinner (floor selector, 1-5)

Dimensions:
- Buttons: 48dp height
- Text: 12sp-14sp
- Padding: 8dp
- Overlay: 150dp height (leave top for map)

No ConstraintLayout. Use LinearLayout only.
```

**What you get back:** `main.xml` (~80 lines)

---

### Task 5.3 — MainActivity implementation

**Input to Claude:**
```
Create MainActivity extends AppCompatActivity:

Lifecycle:
1. onCreate():
   - setContentView(R.layout.main)
   - requestPermissions (ACCESS_FINE_LOCATION, CHANGE_WIFI_STATE, INTERNET)
   - Initialize WifiScanner, HttpBackendClient
   - Bind button listeners

2. onResume():
   - updateStatusUI()

Buttons:
1. "Scan" button:
   - Call WifiScanner.startScan(context)
   - Poll WifiScanner.getLastScanResults() after 2 seconds
   - Display count in status: "Scanned: 5 networks"

2. "Ping" button:
   - Get room name from EditText
   - Get floor from Spinner
   - Call HttpBackendClient.ping() with last scanned results
   - Display: "Pinged: lab_201_f2"

3. "Fetch Map" button:
   - Call HttpBackendClient.getMap()
   - Display in MapView via setMapData()
   - Display: "Map loaded: 8 nodes, 7 edges"

Error handling:
- Show errors in status TextView (red text, 3 sec duration)
- Log to Logcat

Permissions:
- On API 26+, request at runtime
- Show Toast if denied

Use only android.app, android.widget, android.view.
No external libraries.
```

**What you get back:** `MainActivity.java` (~200 lines)

---

## Phase 6: Testing & Deployment

### Task 6.1 — Build command

```bash
# From project root:
./gradlew clean assembleRelease

# Output: app/build/outputs/apk/release/app-release.apk
# Size: expect 400KB–700KB

# Install to connected device:
adb install -r app/build/outputs/apk/release/app-release.apk

# View logs:
adb logcat | grep ibnIPS
```

---

### Task 6.2 — Manual testing checklist

1. **Permissions:**
   - [x] App requests location + Wi-Fi permissions on first run
   - [x] Permissions are granted (Settings > Apps > ibnIPS)

2. **Wi-Fi Scan:**
   - [x] Click "Scan" button
   - [x] Status shows "Scanned: X networks"
   - [x] Check logcat: `adb logcat | grep WifiScanner` shows BSSID + RSSI

3. **Backend ping:**
   - [x] Backend running on live server (https://ibnips.onrender.com)
   - [x] Type room name (e.g., "Lab 201"), select floor 2
   - [x] Click "Ping"
   - [x] Status shows "Pinged: lab_201_f2"
   - [x] Check backend DB / local storage: node created with Wi-Fi fingerprints

4. **Fetch map:**
   - [x] Click "Fetch Map"
   - [x] Map renders (nodes as blue circles, edges as black lines)
   - [x] Status shows "Map loaded: X nodes, Y edges"

5. **Locate Me:**
   - [x] Click "Locate Me" button
   - [x] Scans Wi-Fi networks and matches signals via server / local similarity
   - [x] Status displays "Current location of you is: <Location Name>"
   - [x] User position dot updates on Canvas map

6. **APK size:**
   - [x] `adb shell pm dump com.example.ibnips | grep size`
   - [x] Target < 700KB (Actual: ~44KB)

---

## Backend API Quick Reference

See full schema in project root (`backend_schema.md`).

### Auth
```
POST /api/auth
Body: {"email":"user@iitb.ac.in"}
Response: {"token":"..."}
```

### Ping (tag a room)
```
POST /api/ping
Authorization: Bearer <token>
Body: {
  "name": "Lab 201",
  "floor": 2,
  "previous_node_id": "",
  "steps": -1,
  "direction": "",
  "fingerprints": [{"bssid":"...", "ssid":"...", "rssi":-65}]
}
Response: {"status":"created", "node_id":"lab_201_f2"}
```

### Get Map
```
GET /api/map
Response: {"nodes":[...], "edges":[...]}
```

---

## Delegation Prompts for Claude

Copy-paste these into Claude chat to get working code:

### Prompt 1: Full project structure
```
I'm building a minimal Android app in Java (no Kotlin, no AndroidX).
Backend: ibnIPS (Go + SQLite)
App size target: <700KB

Deliverables needed:
1. build.gradle (R8 shrinking, no external deps)
2. AndroidManifest.xml (permissions + MainActivity)
3. WifiScanResult.java (model for Wi-Fi scan)
4. MapResponse.java, MapNode.java, MapEdge.java (backend models)
5. PositionResponse.java
6. HttpBackendClient.java (HTTP client)
7. WifiScanner.java (Wi-Fi scan helper)
8. MapView.java (Canvas-based map renderer)
9. MainActivity.java (UI + lifecycle)
10. res/layout/main.xml (simple LinearLayout buttons)

Backend API: POST /api/auth, POST /api/ping, GET /api/map
No external libraries except org.json (bundled).
Use HttpURLConnection for networking.
Handle exceptions: log + show in UI.

Generate full working code for all 10 files.
```

### Prompt 2: Focus on a single file
```
I'm building an Android app that scans Wi-Fi and sends data to a Go backend.

Create HttpBackendClient.java with these methods:

1. authenticate(email: String) -> String token
   POST /api/auth, body: {"email": "user@iitb.ac.in"}

2. ping(token, name, floor, previousNodeId, steps, direction, wifiScans) -> String nodeId
   POST /api/ping, Bearer auth, WifiScanResult[] converts to JSON

3. getMap(token) -> MapResponse
   GET /api/map, returns nodes + edges

Use HttpURLConnection + org.json.
Handle 400/401/500 errors: log details, throw or return null.
No retry logic needed yet.
```

### Prompt 3: Debugging help
```
I ran: ./gradlew clean assembleRelease
Got error: [error message]

My project structure:
- app/src/main/java/com/example/ibnips/...
- app/src/main/res/layout/main.xml
- app/build.gradle
- settings.gradle

Debug this and provide a fix.
```

---

## Quick Wins (Low-hanging fruit for later)

After you get the basic app working:

1. **Persist auth token** — save token to SharedPreferences (Android built-in)
2. **Compass UI** — add DeviceSensor orientation listener, rotate compass rose
3. **Pan/zoom** — add GestureDetector for touch, scale map coordinates
4. **Continuous scanning** — use Handler to scan Wi-Fi every 2 seconds
5. **Step counter** — integrate with step sensor (Android Sensor API)
6. **Offline mode** — cache map locally, allow map browsing without internet

---

## Phase 7: UI Enhancements

**Constraint:** No external dependencies, no AndroidX, no Material Components.
All of this is achievable with framework-only APIs: `shape`/`ripple`/`selector`
drawables, `ViewPropertyAnimator`, `ValueAnimator`, `android.graphics`, and
`GestureDetector`/`ScaleGestureDetector`. Keep the APK lean (vector drawables,
no new libraries, no new permissions).

### Tier 1 — Layout & styling (no Java changes, all in `res/`)

**Task 7.1 — Button backgrounds with ripple + rounded corners** (DONE)

**Input to Claude:**
```
Create drawable files for my Android app (no AndroidX, minSdk 26):

1. res/drawable/btn_scan.xml, btn_ping.xml, btn_fetch_map.xml, btn_locate_me.xml
   - Each: <ripple> background wrapping a <shape> with:
     * rounded corners (radius 8dp)
     * a subtle vertical gradient (Material color for each button:
       blue #1565C0, green #2E7D32, orange #E65100, purple #7B1FA2)
     * darker bottom edge band (like a pressed-leather button)
   - Ripple color: white at ~30% opacity

2. Use AndroidX-free syntax: <ripple xmlns:android=...>
   with android:color and a <item android:drawable="@drawable/...">

Return all 4 files (~15 lines each).
```

**Task 7.2 — Overlay panel polish** (DONE)

**Input to Claude:**
```
Polish the bottom control overlay for my Android app (framework-only,
no AndroidX). Current layout: app/src/main/res/layout/main.xml — a
FrameLayout with a full-screen MapView + a 180dp bottom LinearLayout
with 4 buttons, a status TextView, an EditText, and a floor Spinner.

Create res/drawable/panel_bottom.xml:
- Rounded top corners (radius 16dp, only top corners)
- White background, 0.97 alpha
- No external libraries

Then update main.xml to:
- Use android:background="@drawable/panel_bottom" on the overlay
- elevation 8dp
- Increase padding to 12dp, button text to 13sp, status text to 13sp
- Give the EditText and Spinner rounded backgrounds (12dp radius) via
  drawables instead of @android:drawable/edit_text / btn_default

Return panel_bottom.xml + the EditText/Spinner background drawables +
the updated main.xml.
```

**Task 7.3 — Icons on buttons (vector drawables)** (DONE)

**Input to Claude:**
```
Add icons to the 4 buttons in my Android app (framework-only, no AndroidX).

Create res/drawable/ic_scan.xml, ic_ping.xml, ic_map.xml, ic_locate.xml:
- 24x24dp vector drawables, white fill, stroke-based Material-style paths
- Scan: Wi-Fi arcs; Ping: location pin; Map: grid/floor-plan; Locate: crosshair

Then in main.xml, add android:drawableStart="@drawable/ic_..." +
android:drawablePadding="6dp" to each button (reuse existing button
backgrounds). No Java changes.

Return 4 icon files + the button edits from main.xml.
```

**Task 7.4 — Theme & status bar** (DONE)

**Input to Claude:**
```
Create res/values/themes.xml for my Android app (no AndroidX, minSdk 26,
targetSdk 34):

<resources>
  <style name="Theme.ibnIPS" parent="android:Theme.Material.Light.NoActionBar">
    <item name="android:colorPrimary">#1565C0</item>
    <item name="android:colorPrimaryDark">#0D47A1</item>
    <item name="android:colorAccent">#7B1FA2</item>
    <item name="android:windowBackground">@color/window_bg</item>
    <item name="android:statusBarColor">#0D47A1</item>
    <item name="android:windowLightStatusBar">false</item>
  </style>
</resources>

Add <color name="window_bg">#FAFAFA</color> to colors.xml.
Apply via android:theme="@style/Theme.ibnIPS" on <application> in the manifest.
Return themes.xml, the colors.xml addition, and the manifest edit.
```

### Tier 2 — MapView rendering improvements (Java, `MapView.java` only)

**Task 7.5 — Fit-map-to-screen on load** (DONE)

**Input to Claude:**
```
Update MapView.java in my Android app (framework-only).

Current behavior: fixed SCALE = 2f, origin at top-left, nodes may render
off-screen. Change it so that when setMapData() is called:

1. Compute the bounding box of all nodes.
2. Compute a scale factor that fits the whole map into the view with 24px
   padding on every side (using onSizeChanged/getWidth/getHeight).
3. Apply a translate so the bounding box centres inside the view.
4. Keep the public API unchanged (setMapData, setUserPosition).

Keep everything in android.graphics + android.view only. No external
libraries. Return the full updated MapView.java.
```

**Task 7.6 — User dot with pulsing halo** (DONE)

**Input to Claude:**
```
Enhance the user position dot in MapView.java (framework-only).

Current: single red circle, radius 10dp. Change to:
- Outer pulsing ring: radius animates 14dp→26dp, alpha 0→0 (fade out),
  driven by a single ValueAnimator that restarts forever.
- Inner dot: solid red with a thin white stroke ring around it.
- Pause/resume: start the animator in onVisibilityChanged(true) /
  onAttachedToWindow, cancel it when hidden. No leaks.
- Only animate when a user position is actually set (userX/userY >= 0).

Return the updated MapView.java. Use ValueAnimator + ObjectAnimator only.
```

**Task 7.7 — Grid background & cleaner map palette** (DONE)

**Input to Claude:**
```
Update the onDraw() background rendering in MapView.java (framework-only).

1. Replace the flat #FAFAFA fill with:
   - Light #F5F5F5 fill
   - A subtle grid: vertical + horizontal lines every 40px, stroke #E0E0E0,
     1px, drawn only within the map's bounding box (or full canvas if no map)
2. Restyle nodes: fill #1565C0 with a 2px white ring stroke (#FFFFFF).
3. Restyle edges: #90A4AE (blue-grey), 2px, round caps.
4. Labels: keep 9sp but switch to #455A64, with a white shadow/halo for
   readability over the grid.

Return the updated MapView.java, onDraw/helper methods only.
```

### Tier 3 — Micro-interactions (Java, `MainActivity.java`)

**Task 7.8 — Button press scale + status fade** (DONE)

**Input to Claude:**
```
Add micro-interactions to MainActivity.java (framework-only, no AndroidX).

1. Button press feedback: on click, animate the pressed button
   scaleX/scaleY to 0.94 (ViewPropertyAnimator, 100ms), then back to 1.0
   with a spring-ish OvershootInterpolator (300ms). Do this in the existing
   click handlers.
2. Status text: wrap setStatus() so the TextView fades/animates opacity
   0.3→1.0 over 250ms when the message changes (only when text differs).

Keep it small and dependency-free. Return the diff-relevant methods
(setStatus + a private animatePress(View) helper + click handler edits).
```

**Task 7.9 — Animate user dot to new position** (DONE)

**Input to Claude:**
```
In MapView.java add a smooth move for the user dot (framework-only):

1. Add setUserPositionAnimated(x, y, floor): runs a ValueAnimator from the
   current dot position to the target over 600ms with
   DecelerateInterpolator, calling setUserPosition() per frame.
2. Keep the existing setUserPosition() (instant) as-is.
3. In MainActivity.onLocateMeClicked()'s result handler, call
   setUserPositionAnimated(...) instead of setUserPosition(...).

Return the new method + the MainActivity call-site change.
```

### Delegation prompts (copy-paste)

**Prompt A: Full UI enhancement pass**
```
My Android app is minimal Java, framework-only (no AndroidX, no external
libraries). APK target < 700KB, minSdk 26.

Enhance the UI without adding dependencies:

1. res/drawable: ripple+rounded button backgrounds (blue/green/orange/purple),
   panel_bottom.xml (rounded top corners), rounded EditText/Spinner
   backgrounds, and 4 white vector icons (scan/ping/map/locate).
2. values/themes.xml: Theme.ibnIPS (Material.Light.NoActionBar parent),
   colored status bar; wire into the manifest.
3. MapView.java: fit-map-to-screen on load, pulsing halo user dot, grid
   background, restyled nodes/edges/labels.
4. main.xml: apply new backgrounds, icons, spacing, 13sp text.
5. MainActivity.java: button press-scale animation, status fade,
   animated user-dot movement.

Do NOT import androidx or any third-party artifact. Keep all rendering in
android.graphics. Return complete updated files.
```

### UI enhancement checklist

- [ ] Buttons have rounded corners + ripple press feedback
- [ ] Buttons show icons (compound drawables)
- [ ] Overlay panel has rounded top corners, elevation, comfortable padding
- [ ] EditText + Spinner have custom rounded backgrounds
- [ ] Status bar + theme colors applied (no AndroidX)
- [ ] Map auto-fits to screen when loaded
- [ ] User dot has a pulsing halo
- [ ] Grid background renders behind the map
- [ ] Button press-scale animation + status text fade
- [ ] User dot animates smoothly to new location on "Locate Me"
- [ ] APK still builds with no external deps (`./gradlew clean assembleRelease`)
- [ ] APK size stays < 700KB

---

## Commands You'll Need

```bash
# Create project (Android Studio or command-line)
cd ~/projects
mkdir ibnips-android
cd ibnips-android
gradle init --type android-application

# Or manually:
mkdir -p app/src/main/{java/com/example/ibnips,res/{layout,values}}
touch app/build.gradle
touch app/src/main/AndroidManifest.xml

# Build release APK
./gradlew clean assembleRelease

# Install to device
adb install -r app/build/outputs/apk/release/app-release.apk

# View logs
adb logcat -s "ibnIPS"

# Check APK size
ls -lh app/build/outputs/apk/release/app-release.apk

# Uninstall
adb uninstall com.example.ibnips
```

---

## File Tree (Final Structure)

```
ibnips-android/
├── settings.gradle
├── build.gradle (root)
├── build.sh                             ← One-click build script
├── local.properties                     ← SDK path
├── gradle/wrapper/
│   ├── gradle-wrapper.jar
│   └── gradle-wrapper.properties
├── app/
│   ├── build.gradle
│   ├── proguard-rules.pro
│   ├── src/main/
│   │   ├── AndroidManifest.xml
│   │   ├── java/com/example/ibnips/
│   │   │   ├── MainActivity.java
│   │   │   ├── MapView.java
│   │   │   ├── HttpBackendClient.java
│   │   │   ├── WifiScanner.java
│   │   │   ├── WifiScanResult.java
│   │   │   ├── TaggedLocation.java      ← Local fingerprint matching model
│   │   │   ├── MapResponse.java
│   │   │   ├── MapNode.java
│   │   │   ├── MapEdge.java
│   │   │   └── PositionResponse.java
│   │   └── res/
│   │       ├── layout/main.xml
│   │       ├── values/strings.xml
│   │       ├── values/colors.xml
│   │       ├── drawable/ic_launcher_fg.xml
│   │       └── mipmap-anydpi-v26/ic_launcher.xml
│   └── build/outputs/apk/debug/
│       └── app-debug.apk                ← Deliverable (~44KB)
```

---

## Common Pitfalls to Avoid

1. **Forgetting runtime permissions** — Android 6+ requires asking at runtime, not install-time
2. **WifiManager null on scan** — check if location services are enabled + permissions granted
3. **HttpURLConnection hangs** — always set a timeout (add later)
4. **Map rendering crashes** — null-check mapData in onDraw()
5. **APK size creeps up** — watch for accidental AndroidX imports; use `./gradlew dependencies`

---

## Success Criteria

✅ **APK builds to <1MB** (Actual: 44KB)
✅ **App scans Wi-Fi networks and logs BSSIDs**
✅ **App POSTs to backend and gets nodeId back**
✅ **App fetches map and renders nodes + edges on Canvas**
✅ **Locate Me matches Wi-Fi fingerprints and displays location name**
✅ **Scan freshness filter prevents stale OS Wi-Fi scan cache issues**
✅ **App runs on Android 8.0+ without crashes**
✅ **All code is Java (no Kotlin, no AndroidX)**

Once these are met, you're done with Phase 1. Next: offline positioning, compass integration, step counter but don't do anything not mentioned in this file.
