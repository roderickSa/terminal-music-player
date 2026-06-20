# 🎵 Terminal Music Player

A music player that runs in your terminal, built with Node.js, TypeScript, and Ink.

## Features

- 🎧 Audio playback via `mpv`
- 🎨 Gradient banner, album art and an animated mascot
- 📊 Audio spectrum visualizer (real via `cava`, simulated otherwise)
- 📁 File browser with incremental search (`/`)
- 🏷️ Reads ID3 tags (artist · title · album · cover)
- 🎼 Synchronized lyrics from `.lrc` files
- 🔊 Volume control & mute
- 🔀 Shuffle and 🔁 repeat (off / all / one)
- ⌨️ Keyboard controls
- ⏭️ Auto-advance to next track

## Requirements

- **Node.js 22+** (Ink 7 / React 19). An `.nvmrc` is included — run `nvm use`.
- `mpv` installed on your system
- `cava` *(optional)* — enables the real audio spectrum visualizer
```bash
# Ubuntu/Debian
sudo apt install mpv cava

# Arch
sudo pacman -S mpv cava

# Fedora
sudo dnf install mpv cava
```

## Installation
```bash
git clone <your-repo>
cd terminal-music-player
npm install
```

## Usage
```bash
# Open file browser
npm run dev

# Play a specific file directly
npm run dev -- "/path/to/song.mp3"

# Open the browser in a specific folder
npm run dev -- "/path/to/music/folder"
```

The file browser's starting directory is resolved in this order:
the CLI argument → the `MUSIC_DIR` env var → `~/Music` → the current directory.

```bash
MUSIC_DIR="$HOME/Tunes" npm run dev
```

## Controls

### Player

| Key | Action |
|-----|--------|
| `space` | Play / Pause |
| `n` | Next track |
| `p` | Previous track (or restart if >3s played) |
| `l` / `→` | Seek +10s |
| `h` / `←` | Seek -10s |
| `-` / `+` | Volume down / up |
| `m` | Mute |
| `s` | Toggle shuffle |
| `r` | Cycle repeat (off → all → one) |
| `o` | Open file browser |
| `q` | Quit |

### File browser

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate |
| `enter` | Open folder / play file |
| `/` | Incremental search (`esc` to clear) |
| `b` | Go up one folder |
| `q` | Quit |

## Lyrics

Place a `.lrc` file with the same name as your audio file in the same folder.
Supports `[mm:ss]` and `[mm:ss.xx]` timestamps, multiple timestamps per line,
and the `[offset:±ms]` tag.

## Supported formats

`.mp3` `.flac` `.ogg` `.wav` `.m4a` `.aac`

## Development

```bash
npm run dev          # run the app (opens src/music)
npm run typecheck    # tsc --noEmit
npm test             # vitest (domain + use-case tests)
```

## Architecture

Hexagonal — the domain knows nothing about Ink, mpv or the filesystem.

```
src/
  domain/          pure logic (Playlist, RepeatMode, PlayerState, Lyrics, Track)
  ports/           interfaces (audio-player, metadata-reader, lyrics-source, file-system, random)
  use-cases/       PlaybackCoordinator (orchestration) + BrowseDirectory
  infrastructure/  adapters: audio/mpv, metadata, lyrics, fs, ui/ (Ink components)
  bootstrap/       manual DI (container.ts)
  config/          start-dir resolution
```

Dependency rule: `infrastructure → use-cases → domain` (never the reverse).
The UI is just another adapter: it dispatches use cases and subscribes to the
`PlayerState` the coordinator publishes.

## Tech stack

- [Ink 7](https://github.com/vadimdemedes/ink) — React for terminal UIs
- [@inkjs/ui](https://github.com/vadimdemedes/ink-ui) · [ink-gradient](https://github.com/sindresorhus/ink-gradient) · [ink-big-text](https://github.com/sindresorhus/ink-big-text) · [figures](https://github.com/sindresorhus/figures) — UI
- [terminal-image](https://github.com/sindresorhus/terminal-image) — album art in the terminal
- [mpv](https://mpv.io/) — audio engine via JSON IPC socket · [cava](https://github.com/karlstav/cava) — spectrum (optional)
- [music-metadata](https://github.com/borewit/music-metadata) — ID3 tags & cover
- [zod](https://zod.dev/) — validation at the boundaries (mpv IPC)
- [vitest](https://vitest.dev/) — tests
- TypeScript + tsx
