# Project {{NAME}}

Read `../../AGENTS.md` first.

- Template: {{TEMPLATE}}
- Kit: {{KIT}}
- Order: `BRIEF.md` → `SCRIPT.md` → `STORYBOARD.md` → compositions → check → snapshots → render → contact sheet → qa → `REVIEW.md`.
- Do not edit `assets/kit/`; it is generated from the root kit.
- Project-specific assets belong in `assets/` outside `assets/kit/`.
- Run root commands from the repository root, e.g. `pnpm run check {{NAME}}`.

## Visual-done checklist

A video is **not** done when render exits 0. Finish only when:

1. `pnpm run check {{NAME}}` passes.
2. Snapshots / poses at scene boundaries (`pnpm run snapshot {{NAME}} --at …` or `pnpm run poses {{NAME}} --round 00`).
3. Numbered render + `renders/VERSIONES.txt` (`pnpm run render {{NAME}} "note"`).
4. Contact sheet inspected (`pnpm run contact-sheet proyectos/{{NAME}}/renders/{{NAME}}-v01.mp4`).
5. `pnpm run qa` on the MP4; list blockers.
6. `REVIEW.md` with timestamps + evidence paths (creative-review skill) — no adjective-only notes.
7. `pnpm run status {{NAME}}` shows no missing visual gates.
