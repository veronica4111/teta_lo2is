Looking at what's been built and what you've described is missing, here is the next prompt:

```
You are completing the "تيتا لوئيس" (Tita Louis) Arabic RTL children's obstacle
avoidance game. The project already has: Splash, LevelSelect, StoryVideoScreen,
RaceScreen (with perspective road, obstacles, HUD, gas station modal), and
ResultsScreen. Your job is to fix and complete specific missing or broken pieces.
Do NOT rewrite any working screen from scratch. Surgical edits only.

=====================================================================
TASK 1 — CREATE src/data/levels.ts (NEW FILE)
=====================================================================
Create a new file: src/data/levels.ts

This file is the single source of truth for all per-level content. Every screen
in the game that needs level-specific data must import from this file.

The file must export a typed array called `LEVELS` containing exactly 6 level
objects. Each level object must have this exact TypeScript interface:

export interface LevelQuestion {
  id: string;                  // e.g. "l1_q1"
  questionText: string;        // Arabic question text
  answers: {
    id: string;                // "a" | "b" | "c" | "d"
    text: string;              // Arabic answer text
    color: "red" | "blue" | "green" | "yellow"; // one color per answer slot
  }[];
  correctAnswerId: string;     // must match one answers[].id
  audioUrl: string;            // path to question audio file
                               // e.g. "/audio/levels/level1/question1.mp3"
}

export interface Level {
  id: string;                  // "level_1" through "level_6"
  nameAr: string;              // Arabic level name e.g. "المستوى الأول"
  videoUrl: string;            // path to story video e.g. "/video/level1/story.mp4"
  thumbnail: string;           // path to thumbnail image or placeholder emoji string
  color: string;               // hex color for UI accents on this level's tiles
  emoji: string;               // decorative emoji for placeholder scenes
  survivalTargetDistance: number; // distance in units player must survive to win
  questions: LevelQuestion[];  // exactly 3 questions per level
}

Populate all 6 levels with:
- Placeholder videoUrl values following the pattern "/video/level[N]/story.mp4"
- Placeholder audioUrl values following the pattern
  "/audio/levels/level[N]/question[Q].mp3"
- 3 questions per level with Arabic placeholder question text and 4 answer
  options each, with meaningful placeholder content (not lorem ipsum — use
  simple child-appropriate Arabic educational questions as placeholders,
  such as counting, colors, animals, shapes — vary the topic per level)
- The 4 answer buttons for EVERY question must follow this exact color assignment:
  answer slot "a" → color: "red"
  answer slot "b" → color: "blue"
  answer slot "c" → color: "green"
  answer slot "d" → color: "yellow"
  This is fixed per slot, not per answer content. Every question in every level
  uses this same color-to-slot mapping.
- correctAnswerId must point to one of "a", "b", "c", or "d"

After creating this file, add a comment block at the top:
/*
 * ASSET MANIFEST — replace placeholder URLs with real files:
 *
 * VIDEO FILES  → place in /public/video/level[N]/story.mp4
 * AUDIO FILES  → place in /public/audio/levels/level[N]/question[Q].mp3
 *
 * Each level has:
 *   - 1 video file  (story.mp4)
 *   - 3 audio files (question1.mp3, question2.mp3, question3.mp3)
 *
 * Total: 6 videos + 18 audio files
 * No level shares video or audio with any other level.
 */

=====================================================================
TASK 2 — ADD PLAYER CAR TO THE RACE SCREEN (currently missing)
=====================================================================
The RaceScreen currently has a perspective road, obstacles, HUD, and lane
dot indicators — but the player's own car is either missing or not visible.

Open RaceScreen (or the race engine file, whichever renders the road scene).

Add a player car SVG drawn directly in code (no external image file needed —
draw it as an inline SVG or styled div). The car must:
- Appear at the bottom-center of the road canvas, partially cropped by the
  bottom edge of the screen (only the top ~60% of the car is visible, exactly
  like the classic arcade behind-the-car perspective in the reference image)
- Be bright red (#E53935) with simple car details: windshield, side windows,
  front hood — keep it simple but recognizable as a car when viewed from behind
- Move left and right between the 3 lanes smoothly (CSS transition 0.15s ease)
  when the player presses the lane-switch buttons or arrow keys — it must
  visually be in the same lane as the game's logical player lane position
- Be drawn ABOVE the obstacle cars in z-index (player car is always in front)
- Scale appropriately so it looks large relative to the road width — it should
  fill roughly 25-30% of the road width at the bottom

If the existing lane-switching logic already tracks a `playerLane` variable
(left/center/right or 0/1/2), use that exact variable to position the car
horizontally. Do NOT create a duplicate lane state.

Modify at most 2 files for this task (the race screen + one helper if needed).

=====================================================================
TASK 3 — ANSWER BUTTON COLORS IN GAS STATION MODAL
=====================================================================
Open GasStationModal (or wherever the quiz answer buttons are rendered).

Currently all answer buttons look the same. Change them so each answer slot
has its own distinct solid background color, matching this fixed mapping:

Answer slot "a" → background: #EF5350  (red)   text: white
Answer slot "b" → background: #1E88E5  (blue)  text: white
Answer slot "c" → background: #43A047  (green) text: white
Answer slot "d" → background: #FDD835  (yellow) text: #1a1a1a (dark, for contrast)

These colors must:
- Apply in the DEFAULT state (before any answer is selected)
- Be visible clearly — no translucent overlays that wash out the color
- On CORRECT feedback: keep the button's base color but add a thick white
  border (3px solid white) and a ✓ checkmark overlay on the correct button
- On INCORRECT feedback: keep the selected button's base color but add a
  slight dark overlay (rgba 0,0,0,0.25) and an ✗ overlay on the selected
  button; the correct answer button should reveal its true color with a
  white border so the child can see what was right
- The colors come from the `answers[].color` field in the LevelQuestion
  interface defined in Task 1 — read the color from the data, not hardcoded
  by position (though in practice the slot ordering is always a/b/c/d in
  the same colors)

Modify at most 2 files (the modal component + levels.ts if it needs the
color field added, but Task 1 already includes it).

=====================================================================
TASK 4 — WIRE levels.ts INTO ALL SCREENS
=====================================================================
Now that levels.ts exists, connect it so all screens read from it dynamically
based on the selected level. Make these specific connections:

4a. LevelSelect screen:
- Import LEVELS from src/data/levels.ts
- Replace any hardcoded level name, color, emoji, or thumbnail data with
  values from the LEVELS array
- The level tile grid must render from LEVELS.map(...) — 6 tiles dynamically

4b. StoryVideoScreen:
- Import LEVELS from src/data/levels.ts
- Accept the selected level's id as a prop (it likely already gets a level
  prop — just make sure it reads videoUrl from LEVELS.find(l => l.id === id))
- Display the level's nameAr from LEVELS in the top-right badge
- The video element's src must use level.videoUrl from LEVELS
- If the video file is not found (404) or the URL is a placeholder, show the
  existing animated illustrated scene as a fallback — do NOT break the screen

4c. GasStationModal:
- Import LEVELS from src/data/levels.ts
- Accept the current level id as a prop
- Load the 3 questions from LEVELS.find(l => l.id === levelId).questions
- The audio button for each question must reference question.audioUrl for
  the actual audio playback (use an HTML Audio object: new Audio(url).play())
- If the audio file 404s or is missing, fail silently — do not throw an error
  or block the quiz flow. The button should still be tappable but just not
  play audio. Show no error to the user.

4d. RaceScreen:
- Import LEVELS from src/data/levels.ts
- Read survivalTargetDistance from the current level's LEVELS entry
- Use this value as the win condition threshold in the tick loop
  (if a survivalTargetDistance variable already exists in the engine,
  replace its hardcoded value with the one from LEVELS — do not duplicate it)

Modify at most 2 files per sub-task (4a, 4b, 4c, 4d are separate sub-tasks —
complete them one at a time and confirm before moving to the next).

=====================================================================
TASK 5 — VERIFY COMPLETE GAME FLOW END TO END
=====================================================================
After Tasks 1-4 are complete, trace through the full game flow in code and
confirm every transition works:

SPLASH → (tap "إبدأ اللعبة!") → LEVEL_SELECT
LEVEL_SELECT → (tap any unlocked level tile) → STORY_VIDEO for that level
STORY_VIDEO → (tap "يلا نلعب!" or video ends) → RACE_RUNNING for that level
RACE_RUNNING:
  - Player car visible at bottom, moves between lanes on input
  - Obstacle cars approach in 3 lanes
  - Fuel drains continuously
  - [fuel <= 25% AND gasStationVisited == false] → GAS_STATION modal opens,
    game fully pauses
  - GAS_STATION: 3 questions from levels.ts for the current level, each with
    colored answer buttons (red/blue/green/yellow), audio button per question
  - After Q3: gasStationVisited = true, fuel += earned bonus (capped 100%),
    countdown 3-2-1, modal closes, race resumes
  - [fuel <= 0%] → RESULTS screen (success=false)
  - [survivalTargetDistance reached AND fuel > 0%] → RESULTS (success=true)
  - [pause/exit] → LEVEL_SELECT (no result submitted)
RESULTS → (Retry) → RACE_RUNNING with full reset (fuel=100%, score=0,
  gasStationVisited=false, player position reset, obstacles cleared)
RESULTS → (Back to Levels) → LEVEL_SELECT

For any broken transition found, fix it in the minimum files possible.
Report what was broken and what was changed.

=====================================================================
STRICT RULES FOR ALL TASKS
=====================================================================
- Do NOT rewrite any working screen from scratch
- If any audio or image file is referenced but missing, create a placeholder
  stub (silent audio, blank image) at the correct path and log it — do not
  break the pipeline
- All new user-facing text must be Egyptian Arabic dialect
- All layout additions must respect RTL direction
- After each task, report: files changed, what changed, any new missing
  assets identified
```