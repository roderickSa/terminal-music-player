# CLAUDE.md — Terminal Music Player

Reproductor de música de terminal en **Node.js + TypeScript + Ink + mpv**.

## Comandos

```bash
npm run dev          # corre la app (abre src/music por defecto)
npm run dev -- /ruta # abre otra carpeta o reproduce un archivo
npm run typecheck    # tsc --noEmit
npm test             # vitest (solo dominio + use cases)
```

> Proyecto fijado a **Node 22** (Ink 7 / React 19) vía `.nvmrc` → `nvm use`.
> vitest en v3 (funciona en 22; se puede subir a v4 si se quiere).

## Arquitectura (hexagonal)

Regla de dependencias: `infrastructure → use-cases → domain`. Nunca al revés.
El dominio no importa nada de infraestructura.

- `domain/` — lógica pura, testeable sin mocks:
  - `playback/` — `Playlist` (next/prev/shuffle/repeat + historial),
    `RepeatMode` (value object cíclico), `PlayerState` (snapshot para la UI),
    `advance` (unión `AdvanceToTrack | StopPlayback`).
  - `lyrics/` — `parseLrc` (string → `Lyrics`), `Lyrics`, `LyricLine`.
  - `library/` — `Track` (metadata; campos "" nunca undefined).
- `ports/` — interfaces: `AudioPlayer`, `MetadataReader`, `LyricsSource`,
  `FileSystem`, `Random`.
- `use-cases/` — `PlaybackCoordinator` (orquesta Playlist + puertos, publica
  `PlayerState`) y `BrowseDirectory`. Sus métodos públicos SON los casos de uso.
- `infrastructure/` — adapters: `audio/mpv-audio-player` (proceso + socket IPC,
  SOLO transporte), `metadata` (tags + carátula), `lyrics`, `fs`, `random`,
  `spectrum` (`cava` real o simulado), y `ui/` (Ink: App, FilePicker, Mascot,
  Visualizer, CoverArt, theme).
- `bootstrap/container.ts` — DI manual (adapters → coordinator → use cases).
- `config/` — `resolveStartDir`, `AUDIO_EXTENSIONS`.

## Convenciones

Ver la skill `codigo-hexagonal` (en `.claude/skills/`). En resumen:
- Clases con `readonly`, sin `any`/`as`/`console` (salvo el fatal de mpv en
  `index.ts`). Uniones discriminadas con `instanceof` + `exhaustive()`.
- `Math.random`/`Date` solo en infraestructura, vía puertos (el shuffle usa
  el puerto `Random` para ser testeable).
- zod solo en los bordes (parsing del socket de mpv).
- Tests: dominio sin mocks; use cases con fakes de puertos
  (`use-cases/test-doubles/`). Correr solo specs afectados.

## Notas

- El adapter de mpv lanza un proceso por pista y consulta estado por polling
  (250 ms). Mejora futura registrada: mpv persistente + `observe_property`.
- La mascota es `infrastructure/ui/Mascot.tsx` ("Lumi"), original y a color.
- Acentos/títulos usan la paleta `infrastructure/ui/theme.ts` (`CREAM`).
