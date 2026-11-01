# Game Design Document (GDD) — CITY HIDEOUT

## 1. Core Pillars
1. **Immediate Tension & Clarity**: Every match begins with a 10-second scramble where Hiders scatter from the City Center while the Seeker watches the countdown from the locked Precinct zone.
2. **Clever Hiding vs. Active Risk**: Hiding inside one of the 18–20 urban objects conceals a Hider from sight, but staying hidden forever is risky because Seekers move at 1.5× speed and systematically inspect hiding spots.
3. **Teamwork at the City-Center Beacon**: Hiders can force an active victory by completing three 15-second signal stages on the central beacon.
4. **Frictionless Guest & Mobile Access**: Players join in seconds via **Play as Guest** across desktop and mobile devices.

## 2. Player Roles

### Hider
- **Spawn**: City-Center Plaza around the Signal Beacon.
- **Speed**: `100%` (`160 px/s`).
- **Abilities**:
  - Move freely during the 10-second head start and active match.
  - Enter any unoccupied hiding object within interaction range (`64 px`) and line of sight.
  - Exit hiding at any time to relocate or push the central objective.
  - Hold the City-Center Escape Beacon to progress the current 15-second stage.

### Seeker
- **Spawn**: North-West Precinct Deploy Zone (locked during the 10-second head start).
- **Speed**: `120%` (`192 px/s` — `1.2×` Hider speed).
- **Abilities**:
  - **Direct Elimination**: Catch visible, unhidden living hiders within `58 px` with clear line of sight (cannot eliminate through walls).
  - **Inspect Hiding Object**: Inspect eligible hiding places within `64 px` (`600ms` cooldown). If occupied, the hidden hider is immediately eliminated and occupancy is cleared.

## 3. Match Flow & States
`LOBBY` → `PLAYER_ASSIGNMENT` → `MATCH_INITIALIZATION` → `HIDER_HEAD_START` (10s) → `SEEKER_RELEASED` / `MATCH_ACTIVE` → `MATCH_COMPLETED` → `RETURN_TO_LOBBY`.

## 4. Objective Design (3 × 15s Stages)
- Located in the exact center of the map (`(800, 560)` on Downtown Metro Plaza; `(880, 600)` on Harbor Shipping District).
- Requires **3 discrete stages**, each taking **15 uninterrupted seconds** of interaction by at least one living, unhidden hider.
- If all interacting hiders leave the beacon zone or are eliminated, current stage progress resets to `0.0s`, while previously completed stages (`1/3`, `2/3`) remain permanently locked in.

## 5. Win & Loss Conditions
- **Hider Victory**: At least one hider is alive AND Stage `3/3` of the Escape Beacon is completed (or optional survival timer expires when enabled).
- **Seeker Victory**: All hiders are eliminated (`0` living hiders remaining).
