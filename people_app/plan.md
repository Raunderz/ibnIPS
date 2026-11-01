# People App — plan.md

## Purpose
A read-only Android app for everyday users (non-admin). Fetch map, show reviews, locate-me, and to/from routing. No login required (backend auth is OFF by default). Google Maps look-and-feel. Separate from `lite_app`, which stays admin-only (write/tag).

## Scope (in)
- GET `/api/map` — fetch floor graph (nodes + edges)
- GET `/api/feedback` — list reviews
- Locate-me — Wi-Fi scan match vs local fingerprints (local, no server call)
- To/from routing — A* over the map graph, draw route line
- Map view — custom Canvas: nodes, edges, user dot, route polyline, labels
- Bottom sheet / detail view for a selected room

## Scope (out)
- No `POST /api/ping`, no auth screen, no token storage, no tagging
- No Google Maps SDK (too heavy, needs API key/billing) — custom Canvas map
- No admin write features

## Stack
- Language: Java (no Kotlin)
- Build: Gradle, Android SDK only (min external deps)
- Networking: OkHttp (allowed now) — cleaner than HttpURLConnection, small APK impact
- JSON: `org.json` (bundled with Android)
- Map: custom `View` drawing on Canvas (nodes/edges as lines+dots, user dot, route polyline)
- Layout: standard `LinearLayout`/`FrameLayout` + bottom sheet dialog
- Wi-Fi: reuse `WifiScanner.java` pattern from lite_app

## Folder layout
```
people_app/
  app/
    src/main/java/com/example/ibnips/people/
      MainActivity.java       // bottom nav: Map | Reviews | Route
      MapView.java            // Canvas map, user dot, route line, labels
      HttpClient.java         // OkHttp GET /api/map, GET /api/feedback
      Router.java             // A* pathfinding over nodes/edges
      ReviewSheet.java        // bottom sheet showing reviews
      RouteSheet.java         // bottom sheet showing to/from route
      models/
        MapResponse.java
        MapNode.java
        MapEdge.java
        FeedbackItem.java
        PositionResponse.java
    src/main/res/
      layout/                 // main.xml, bottom sheets
      values/                 // colors, strings
  build.gradle
  settings.gradle
  build.sh
```

## Map clutter strategy
- Filter nodes to visible viewport only
- Skip edges longer than a threshold (zoom-dependent)
- Show labels only for selected room + nearest few nodes
- Pulsing user dot at center; route line highlighted when routing

## Navigation
Bottom nav with 3 tabs:
1. **Map** — live map view, user dot, locate-me button
2. **Reviews** — feedback list from `/api/feedback`
3. **Route** — to/from picker + A* route line on map

## Build
`./build.sh` produces a release APK (< 1 MB target). Same lean philosophy as lite_app.

## Not decided
- Whether to use OkHttp or keep HttpURLConnection
- Whether to package a pre-filtered map.json or filter live
- Exact color palette / branding
