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

4. fetchPosition(token, wifiScans) → PositionResponse (optional for later)
   - POST to backend (you'll add this later if needed)

Use only HttpURLConnection, org.json.
Handle errors: log exception, return null or throw.
No timeout handling needed yet (can add later).
```

**What you get back:** `HttpBackendClient.java` (~120 lines)

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
   - [ ] App requests location + Wi-Fi permissions on first run
   - [ ] Permissions are granted (Settings > Apps > ibnIPS)

2. **Wi-Fi Scan:**
   - [ ] Click "Scan" button
   - [ ] Status shows "Scanned: X networks"
   - [ ] Check logcat: `adb logcat | grep WifiScanner` shows BSSID + RSSI

3. **Backend ping:**
   - [ ] Backend running on localhost:3000
   - [ ] Type room name (e.g., "Lab 201"), select floor 2
   - [ ] Click "Ping"
   - [ ] Status shows "Pinged: lab_201_f2"
   - [ ] Check backend DB: node created with Wi-Fi fingerprints

4. **Fetch map:**
   - [ ] Click "Fetch Map"
   - [ ] Map renders (nodes as blue circles, edges as black lines)
   - [ ] Status shows "Map loaded: X nodes, Y edges"

5. **APK size:**
   - [ ] `adb shell pm dump com.example.ibnips | grep size`
   - [ ] Expect 400KB–700KB

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
├── app/
│   ├── build.gradle
│   ├── src/main/
│   │   ├── AndroidManifest.xml
│   │   ├── java/com/example/ibnips/
│   │   │   ├── MainActivity.java
│   │   │   ├── MapView.java
│   │   │   ├── HttpBackendClient.java
│   │   │   ├── WifiScanner.java
│   │   │   ├── WifiScanResult.java
│   │   │   ├── MapResponse.java
│   │   │   ├── MapNode.java
│   │   │   ├── MapEdge.java
│   │   │   └── PositionResponse.java
│   │   └── res/
│   │       └── layout/
│   │           └── main.xml
│   └── build/outputs/apk/release/
│       └── app-release.apk ← Your deliverable
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

✅ APK builds to <1MB
✅ App scans Wi-Fi networks and logs BSSIDs
✅ App POSTs to backend and gets nodeId back
✅ App fetches map and renders nodes + edges on Canvas
✅ App runs on Android 8.0+ without crashes
✅ All code is Java (no Kotlin, no AndroidX)

Once these are met, you're done with Phase 1. Next: offline positioning, compass integration, step counter but don't do anything not mentioned in this file.
