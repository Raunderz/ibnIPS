# ibnIPS

**I Better Navigate** — Indoor Positioning System.

Locating yourself inside a campus building using the Wi-Fi networks that are
already there. No GPS indoors, no beacons, no extra hardware.

## How It Works

**Ambient Wi-Fi is the signal.** Every access point broadcasts continuously, and
its signal strength at your position is roughly predictable. A phone already
receives this information during any scan, so positioning needs no new hardware
on either the user or the building.

**Rooms are fingerprinted, positions are inferred.** Instead of trying to
compute coordinates from signal geometry, the system learns what each room
*looks like* in Wi-Fi terms and then recognises which room a scan resembles.
Signal strength alone is too noisy for geometry; room-level fingerprint
matching is what makes the approach practical.

**A room remembers a distribution, not a reading.** The signal in one room
moves as you cross it, so a single stored value cannot represent the room. Each
room keeps the average signal and the spread for every network it has heard.
A live scan is then tested against that spread — *is this reading plausible for
this room* — rather than against a fixed number.

**Accuracy compounds with visits.** Re-walking a room refines its statistics
instead of adding rows. The same input, submitted repeatedly, produces a
progressively sharper model, which is why coverage effort maps to accuracy
directly.

**Every device benefits from every walk.** Tagging is a shared write, not a
per-device one. A room tagged once is usable from any phone, and the fallback
local matcher only exists so the app still answers when the network does not.

**Confidence is reported, not implied.** A match carries how strongly the
evidence supports it, and how much data stands behind it. A weak answer is
presented as weak, and the client is free to distrust it.

## Principles

- **Privacy** — position is derived on-device from ambient signals already
  exposed by the Wi-Fi stack. Nothing about a user's movement is required to
  locate them, and no per-user location history is needed for the system to work.
- **Progressive enhancement** — accuracy grows with coverage. A sparsely mapped
  building returns low-confidence answers rather than failing outright.
- **Graceful degradation** — offline, or on a low-confidence answer, the app
  falls back to on-device matching instead of showing nothing.
- **Boring code** — plain functions, no clever abstractions, comments that
  explain *why*. Correctness over cleverness.
- **Bounded growth** — per-request limits on size and frequency; stored data
  stays proportional to distinct rooms and networks, not to total visits.

## Repo Layout

| Path | Role |
|------|------|
| `lite_app/` | **Primary frontend** — Android app, pure Java, no external dependencies |
| `backend/` | **Primary backend** — API service on Erlang/BEAM with SQLite storage |
| `map_maker/` | Tooling — browser map editor, exports the map the API serves |
| `app/`, `kt_app/` | Secondary / experimental frontends |

`lite_app` and `backend` are the source of truth for behaviour and API
contracts.

## Getting Started

```bash
cd backend && gleam run     # API on :3000, creates its database on first run
cd backend && gleam test    # test suite
cd lite_app && ./build.sh   # Android APK
```

## Documentation

- [`backend/schema.md`](backend/schema.md) — API reference: endpoints, request
  and response shapes, error codes, and how matching is scored
- [`backend/README.md`](backend/README.md) — backend setup and configuration
- [`lite_app/guide.md`](lite_app/guide.md) — Android app notes

Operational configuration is documented alongside the code it configures rather
than here.

## Limitations

Accuracy depends on the building, not on the software.

- **Sparse coverage** — few networks in range means a weak match.
- **Signal bleed** — networks from adjacent floors can confuse floor detection.
- **Interference** — crowded or busy environments degrade readings.
- **Access-point churn** — networks that move or are decommissioned age out
  after a staleness window, but need to be re-walked to be re-learned.
- **Unweighted networks** — a building-wide network is visible from every room
  and carries little information; weighting networks by how many rooms see them
  is the next accuracy improvement.
- **Rooms are identified by name** — two genuinely different rooms whose names
  differ only by punctuation are treated as one room.

## Possible Improvements

- Weight networks by how many rooms observe them
- Motion smoothing across successive position estimates
- Coverage heatmaps to guide mapping effort