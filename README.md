# 🎵 Terminal Music Player

A music player that runs in your terminal, built with Node.js, TypeScript, and Ink.

## Features

- 🎧 Audio playback via `mpv`
- 📁 File browser to navigate and pick songs
- 🎼 Synchronized lyrics from `.lrc` files
- 📊 Spectrum visualizer
- ⌨️ Keyboard controls
- 🔀 Auto-advance to next track

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
```

## Controls

| Key | Action |
|-----|--------|
| `space` | Play / Pause |
| `n` | Next track |
| `p` | Previous track (or restart if >3s played) |
| `l` / `→` | Seek +10s |
| `h` / `←` | Seek -10s |
| `o` | Open file browser |
| `q` | Quit |

## Lyrics

Place a `.lrc` file with the same name as your audio file in the same folder:

## Supported formats

`.mp3` `.flac` `.ogg` `.wav` `.m4a` `.aac`

## Tech stack

- [Ink](https://github.com/vadimdemedes/ink) — React for terminal UIs
- [mpv](https://mpv.io/) — audio engine via JSON IPC socket
- [music-metadata](https://github.com/borewit/music-metadata) — ID3 tag reading
- TypeScript + tsx
