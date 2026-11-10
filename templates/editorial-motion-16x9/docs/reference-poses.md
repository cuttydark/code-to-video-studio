# Poses de referencia — editorial-motion-16x9

```bash
pnpm run snapshot <name> --at 0.5,1.8,3.0,5.0,7.5,9.2,10.5
```

| t (s) | Escena | Qué debe leerse |
| --- | --- | --- |
| 0.5 | s00 | Titular landscape; geometría equilibrada |
| 1.8 | s01 | Dato / número hero |
| 3.0 | s01 | Etiquetas laterales legibles |
| 5.0 | s02 | Comparativa + morph mid |
| 7.5 | s03 | Proceso en fila / columnas |
| 9.2 | s04 | Zoom-through |
| 10.5 | s05 | Takeaway tipográfico en hold |

Helpers: `EM.morph`, capas parallax, zoom-through; no `Math.random` sin seed.
