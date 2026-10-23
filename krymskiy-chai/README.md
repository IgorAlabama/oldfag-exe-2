# Крымский чай — OLDfag.exe Arcade Edition v1.2

Standalone entry: `krymskiy-chai/index.html`. All assets are relative; `finale/play.html` is embedded as a full-screen cutscene when the score reaches 400.

- 0–99: tea catching, sugar/coffee hazards.
- 100: automatic transition to level 2, kettle panel slides into view. No intrusive tutorial popup.
- Kettle heating 20s, steals +/-20, refill 7s; Kolya approaches with cup and retreats with a line when beaten.
- 300: `ПОСЛЕДНИЙ ЛИТР!` transient overlay.
- 400: winning cutscene with camera motion, eyes energy, fire, speed lines, fireworks and responsive 16:9 letterboxed layout. Cutscene deliberately skips original title still.
- Speed: x1 at 0, x1.6 at 100, x2.2 at 200, x2.8 at 300, x3.0 at 400. No test speed or stage selectors.
- Audio: short gameplay SFX; does not add a new music track. Site soundtrack remains controlled by OLDfag.exe.
- `arcade_icon.webp`: approved cover art for arcade selector.
- Keyboard: 1–4 / WASD / arrows to switch catch direction. Click/tap on one of four sections; click kettle when ready/boiled.

No build step, dependencies or server required; standard static GitHub Pages hosting.
