# 🎵 Terminal Music Player

A music player that runs in your terminal, built with Node.js, TypeScript, and Ink.

## Features

- 🎧 Audio playback via `mpv`
- 📁 File browser with incremental search (`/`)
- 🏷️ Reads ID3 tags (artist · title · album)
- 🎼 Synchronized lyrics from `.lrc` files
- 🔊 Volume control & mute
- 🔀 Shuffle and 🔁 repeat (off / all / one)
- 🦖 Animated ASCII buddy that reacts to playback
- ⌨️ Keyboard controls
- ⏭️ Auto-advance to next track

## Requirements

- Node.js 18+
- `mpv` installed on your system
```bash
# Ubuntu/Debian
sudo apt install mpv

# Arch
sudo pacman -S mpv

# Fedora
sudo dnf install mpv
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

## Tech stack

- [Ink](https://github.com/vadimdemedes/ink) — React for terminal UIs
- [mpv](https://mpv.io/) — audio engine via JSON IPC socket
- [music-metadata](https://github.com/borewit/music-metadata) — ID3 tag reading
- TypeScript + tsx
