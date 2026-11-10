# Reference poses — starter-9x16

Small board of expected key poses (no heavy PNG baselines). After `pnpm run new starter-9x16 <name>`, capture these with:

```bash
pnpm run snapshot <name> --at 0.2,1.4,3.6,4.6,5.5,7.6,8.4,10.0,11.6
# or storyboard rounds:
pnpm run poses <name> --round 00
```

| t (s) | Scene | What must read |
| --- | --- | --- |
| 0.2 | s01 | Title entering; rings not yet complete |
| 1.4 | s01 | Punch + BRIEF label + dots visible |
| 3.6 | s01 | Hold: orbit readable, no clutter |
| 4.6 | s02 | Process title sharp |
| 5.5 | s02 | At least two nodes + one connector mid-draw |
| 7.6 | s02 | All three nodes + connectors complete |
| 8.4 | s03 | Proof title on screen |
| 10.0 | s03 | Proof marks / checklist visible |
| 11.6 | s03 | Final hold before cut |

Helpers to prefer in compositions: `MAFIA.starter.camera`, `MAFIA.starter.punch`, `MAFIA.draw`, `MAFIA.pop`, `MAFIA.fade`, `MAFIA.rand(seed)` only if randomness is required.
