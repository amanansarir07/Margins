# Margins Design Direction

This document plans a UI redesign only.

The engine and engine tests remain unchanged.

## 1. Current UI audit

The current UI feels like a generic website in these places:

- A title hero centers the product before presenting a decision.
- A dark gradient background resembles a generic space landing page.
- Tabs hide eight important choices behind a horizontal control.
- Every component uses the same rectangular choice card.
- Panels repeat one border, fill, padding, and corner radius.
- Forms use ordinary selects for mission and difficulty choices.
- Paragraphs explain rules before players make decisions.
- Resource bars look like dashboard widgets.
- Pills carry source, critical-resource, and status labels alike.
- The default font feels like an unbranded system interface.
- Buttons use generic “Continue” language.
- The flight canvas has no physical relationship to spacecraft choices.
- The review screen is a checklist rather than a launch decision.
- The debrief presents score rows like an analytics report.
- The SVG chart is useful, but visually detached from the mission.

### Delete list

Delete these screens or elements when the redesign is implemented:

- Separate title hero.
- Separate glossary page.
- Separate explanatory paragraphs.
- Separate mission setup form.
- Horizontal component tab strip.
- Identical component cards.
- Generic destination fact-card grid.
- Generic source pills where inline labels suffice.
- “Continue to Go/No-Go review” button.
- Repeated “What is this?” copy beside every obvious control.
- Decorative starfield gradients behind decision surfaces.
- Review checklist rows that duplicate gauge information.
- Score bars that do not change a decision.
- Chart legend text that repeats visible labels.

Keep information that changes a decision:

- Objective and requirements.
- Source and verification labels.
- Resource limits and margins.
- Component trade-offs.
- Launch compatibility.
- Event outcomes.
- Reasons for failure.
- Recovery suggestions.

## 2. Design tokens

### Color

Use these tokens exactly:

| Token | Hex | Use |
| --- | --- | --- |
| Ink Navy | `#14213D` | Text, outlines, icons, dark surfaces |
| Launchpad Yellow | `#FFC20E` | Primary actions, selected states, warnings |
| Rocket Red | `#E63B2E` | Failed checks, damage, destructive states |
| Signal Mint | `#2EC4A6` | Passed checks, healthy margins, telemetry |
| Lunar Grey | `#C9D1D9` | Light surfaces, dividers, inactive controls |
| Deep Sky | `#2B5BD7` | Links, active navigation, secondary actions |

Use Ink Navy text on every light surface.

Do not use soft grey text on light backgrounds.

### Type

Use two self-hosted OFL fonts.

- Display: **Bowlby One SC**, chunky and compact.
- Body: **Atkinson Hyperlegible**, clear at small sizes.

Store font files as woff2 in `/public/fonts`.

Do not add an npm font package.

Record font attribution in `README.md`.

Use display type for mission names and stamps.

Use body type for controls, values, and explanations.

### Shapes and depth

- Use thick 3px Ink Navy outlines.
- Use flat fills, not gradients.
- Use hard offset shadows, never soft blur.
- Use 0px radius for gauges and telemetry strips.
- Use 8px radius for controls and component parts.
- Use 20px radius for mission patches and stamps.
- Use irregular silhouettes for spacecraft parts.
- Use offset shadows at 5px by 5px.

## 3. Layout concept

The player should see the next decision immediately.

### Mission select

Replace the title page with a solar-system map.

Three destinations are clickable mission nodes.

Each node shows objective, difficulty, and critical resources.

The map is a selection tool, not a decorative illustration.

```text
+------------------------------------------------------------------+
| MARGINS                         STARS 0       PATCH WALL         |
|                                                                  |
|        [ SUN ]----o MOON                                         |
|             \       objective: map ice                          |
|              \      critical: power, data                       |
|               \    [SELECT MOON]                                 |
|                \                                                  |
|                 o MARS                 o EUROPA                  |
|                 minerals              hidden ocean               |
|                 power, comms           nuclear, comms              |
|                                                                  |
| [CADET] [ENGINEER] [FLIGHT DIRECTOR LOCKED]                     |
|                                                                  |
| SELECTED: MOON       [BUILD THIS MISSION]                        |
+------------------------------------------------------------------+
```

No hero tagline appears.

### Workbench

Show the spacecraft as the central decision object.

Parts are selected from a physical shelf.

Gauges stay visible without opening another panel.

```text
+------------------------------------------------------------------+
| MOON / ICE MAPPING                         03:12   ENGINEER      |
+----------------------+----------------------+--------------------+
| PARTS SHELF          | SPACECRAFT SIDE VIEW | GAUGE CLUSTER      |
|                      |                      |                    |
| [ BUS ]              |       [ANTENNA]      | MASS               |
|  [compact] [heavy]   |           |          | [balance scale]    |
|                      | [POWER]-[BUS]-[COMMS] | 112 / 180 kg      |
| [ POWER ]            |      |       |       |                    |
|  [solar] [nuclear]   | [COMPUTER] [ATTITUDE]| POWER              |
|                      |           |          | [battery]  42 W    |
| [ INSTRUMENTS ]      |     [INSTRUMENT]     | BUDGET             |
|  [radar] [spectro]   |                      | [fuel gauge]       |
|                      | [LAUNCH VEHICLE]    | COMMS / DATA        |
| [DRAG PART HERE]     |                      | [signal bars]       |
|                      |                      | TIME [clock]       |
+----------------------+----------------------+--------------------+
| SELECTED PART: RADAR       [REMOVE] [LOCK DESIGN]                |
+------------------------------------------------------------------+
```

Use click, keyboard selection, and drag only as an optional shortcut.

Every part must show its changed resources before selection.

### Flight

Flight should show a decision under time pressure.

Telemetry is a strip, not a second dashboard.

```text
+------------------------------------------------------------------+
| FLIGHT  /  TRANSIT                         00:18 EVENT TIMER     |
+------------------------------------------------------------------+
|                                                                  |
|       EARTH o=====================>o MOON                       |
|                    ^ spacecraft                                  |
|                                                                  |
| POWER  ████████░░   DATA ██████░░░░   COMMS ███████░░░           |
| MASS   112 kg       TIME 04 / 400 days                           |
|                                                                  |
|                  +-----------------------------------+           |
|                  | SOLAR FLARE                       |           |
|                  | Power margin is 12%.              |           |
|                  | [SHIELD POWER] [KEEP COURSE]     |           |
|                  | Timer: 00:12                      |           |
|                  +-----------------------------------+           |
|                                                                  |
| PHASE: TRANSIT       EVENT 1 OF 3       [PAUSE]                  |
+------------------------------------------------------------------+
```

Event choices must state their immediate trade-off.

### Debrief

The result should feel like a mission artifact.

```text
+------------------------------------------------------------------+
| MISSION DEBRIEF                         MOON / ICE MAPPING       |
+------------------------------------------------------------------+
|                                                                  |
|                 +------------------+                             |
|                 |   MISSION PASS   |  [STAMP]                    |
|                 +------------------+                             |
|                    ★ ★ ★ ☆ ☆                                      |
|                                                                  |
|              [AUTO-GENERATED MISSION PATCH]                     |
|                                                                  |
| SCORE 742        RANK: CADET       STARS EARNED: 2               |
|                                                                  |
| WHAT CHANGED THE RESULT                                           |
| [POWER] [DATA] [BUDGET] [TIME]                                  |
|                                                                  |
| +--------------------------------------------------------------+ |
| | WHAT WOULD HAVE SAVED YOU                                    | |
| | Replace standard radio with high-gain radio.                 | |
| | Cost +$35M   Mass +8 kg   Data margin +40 Mbit/day           | |
| | [APPLY THIS FIX]                                             | |
| +--------------------------------------------------------------+ |
|                                                                  |
| [RERUN WITH CHANGES]      [SAVE PATCH]                           |
+------------------------------------------------------------------+
```

## 4. Game feel

All sounds are synthesized with the Web Audio API.

No audio files are required.

Respect `prefers-reduced-motion` for every animation.

| Interaction | Sound | Animation | Vibration |
| --- | --- | --- | --- |
| Select destination | Two-note locator beep | Node expands and route highlights | 12ms |
| Change component | Short metallic click | Part snaps into its slot | 8ms |
| Remove component | Descending tick | Part slides back to shelf | 8ms |
| Healthy margin | Soft rising tone | Gauge settles in mint | None |
| Margin below 15% | Low warning pulse | Gauge flashes yellow once | 15ms |
| Failed margin | Two low pulses | Gauge shakes twice in red | 30ms |
| Launch | Rising filtered oscillator | Ship lifts along path arc | 40ms |
| Phase change | Single clean chime | Telemetry strip advances | 12ms |
| Event appears | Three-note alert | Pop-up stamps into place | 25ms |
| Event choice | Confirmed click | Chosen card locks; timer stops | 15ms |
| Event timeout | Cutoff buzz | Timer bar empties red | 40ms |
| Mission pass | Three-note cadence | Stamp lands with hard shadow | 35ms |
| Mission fail | Low resolved tone | Stamp lands upside down | 35ms |
| Star earned | Bright ping | Star pops once | 10ms |
| Patch saved | Short radio chirp | Patch slides onto wall | 15ms |

Reduced motion keeps state changes instantaneous.

Reduced motion still preserves color and text feedback.

## 5. Progression

Each mission awards 3 possible stars:

1. Mission succeeds.
2. Mission finishes under budget.
3. Every resource margin stays above 15%.

Ranks use total stars:

- Cadet: 0 to 8 stars.
- Engineer: 9 to 17 stars.
- Flight Director: 18 or more stars.

The Patch Wall stores auto-generated mission patches.

Each patch uses the destination, score, and earned stars.

Store patches in `localStorage` with guarded error handling.

The wall shows newest patches first.

Patch generation uses flat shapes, not external images.

## 6. Writing rules

Keep every displayed line to 12 words maximum.

Use numbers instead of adjectives.

Do not use marketing phrases.

Buttons say exactly what they do.

Examples:

- `BUILD MOON MISSION`
- `REPLACE WITH HIGH-GAIN RADIO`
- `RUN GO / NO-GO CHECK`
- `LAUNCH MISSION`
- `RERUN WITH CHANGES`

Errors name what broke and how to fix it.

Example:

`Launch blocked: vehicle capacity is 140 kg. Remove 18 kg.`

Banned words:

- embark
- journey
- unleash
- seamless
- empower
- explore the cosmos
- elevate
- discover

## 7. Anti-generic review

Question: would any generic space-game site look like this?

The first draft risked that outcome.

The solar-system map, stars, patches, and spacecraft are familiar motifs.

I revised the direction in these ways:

- Removed the title hero and its tagline.
- Made destination selection the first decision.
- Made every visual object show a measurable trade-off.
- Replaced generic cards with physical shelf parts.
- Replaced tabs with a spacecraft slot layout.
- Made gauges represent actual engine resources.
- Made event pop-ups require timed decisions.
- Made patches encode the player's real mission result.
- Removed gradients, soft shadows, and decorative starfields.
- Kept source labels only where trust changes a choice.

The result uses space-game language as an instrument.

It does not use it as page decoration.
