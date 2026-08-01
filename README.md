# ibnIPS

Indoor positioning system for campus buildings. Uses ambient Wi-Fi signals to determine user location without GPS.

## What It Does

- Shows your location on a floor plan in real-time
- Switches between floors
- Lets you tag locations to improve accuracy
- Works offline (with mock data)

## Why It Might Matter

GPS doesn't work indoors. ibnIPS fills that gap using infrastructure that already exists—no new hardware, no beacons, no special sensors. If you're inside a building, it knows roughly where you are.

**Realistic limitations:**
- Accuracy depends on Wi-Fi density. Dense networks → better positioning. Sparse networks → worse.
- Works best in structured environments (universities, offices, malls). Less predictable in open buildings or areas with weak signals.
- Requires a baseline of user-contributed location data to function. Cold start is weak.
- Performance degrades near walls, metal structures, and areas with signal interference.

## Features

### Real-Time Positioning
Position updates every 3–5 seconds. Shown as a blue pin on the floor plan. No guarantee of precision—depends on signal environment.

### Floor Detection
Automatically locks to your current floor. Occasional false-floor issues if floor boundaries have signal bleed.

### Location Tagging
Users can manually tag where they are. Improves system accuracy over time. Only works if users actually do it.

### Mock Mode (Testing)
Inject test location data without live signals. Useful for demos when Wi-Fi is unavailable.

### Offline Support
Floor plans cached locally. Room list cached. App works without internet in mock mode.

## Architecture

```
Frontend (React Native)
  ↓ HTTP JSON
Backend API (Go / Gleam)
  ↓ Queries
SQLite Database
```

Frontend handles UI and Wi-Fi scanning. Backend calculates position using weighted signal strength. Database stores location fingerprints.

## Tech Stack

- **Frontend:** React Native (Android)
- **Backend:** Go or Gleam (TBD)
- **Database:** SQLite
- **Communication:** HTTP/JSON

## Quick Start

### Frontend
```bash
npm install
npm start
```

Requires Android 8.0+. Wi-Fi access permission needed.

### Backend
```bash
go run main.go
# or
gleam run
```

Expects SQLite database at `./icps.db`. Listens on `:8080`.

### Database
```bash
sqlite3 icps.db < schema.sql
# Seed with sample locations
sqlite3 icps.db < seed.sql
```

## API Endpoints

### Tag a Location
```
POST /api/tag
{
  "room_id": "Lab_201",
  "scans": [
    {"bssid": "00:11:22:33:44:55", "rssi": -65},
    ...
  ]
}
```

Stores Wi-Fi fingerprint for a known location.

### Get Current Position
```
POST /api/locate
{
  "scans": [
    {"bssid": "00:11:22:33:44:55", "rssi": -67},
    ...
  ]
}
```

Returns `{floor, x, y, room_nearest, confidence}`.

## Testing

Run mock data scenarios without live signals:
- Settings → Mock Mode → Select test scenario
- Verify position updates correctly
- Use for demos when campus Wi-Fi is unavailable

## Known Issues

- **Cold Start:** Without prior location tags, positioning is unreliable.
- **Signal Bleed:** Weak signals from adjacent floors can cause floor misidentification.
- **Sparse Coverage:** Buildings with few Wi-Fi networks will have poor accuracy.
- **Crowded Environments:** High interference reduces signal reliability.
- **Stale Fingerprints:** Old Wi-Fi readings (from decommissioned access points) clutter the database.

## Possible Improvements (Not Done Yet)

- Confidence thresholds (hide pin if confidence < X%)
- Fingerprint aging and automatic cleanup
- Multi-device fingerprint aggregation
- Kalman filtering for smoother position tracking
- Heatmaps showing coverage areas
- Building map integration (beyond floor plans)

## Team

- Backend: Position algorithms, API, database design
- Frontend: Map UI, Wi-Fi scanning, real-time updates
- Database: Schema, data validation, query optimization
- Testing: End-to-end validation, mock data scenarios

## Deployment

Backend runs as single binary. Requires SQLite file and permission to listen on port 8080.

Frontend builds to APK for Android distribution.

No external dependencies. Portable.
