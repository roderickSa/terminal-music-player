import { Box, Text, useApp, useInput } from "ink";
import { useState, useEffect, useRef } from "react";
import Gradient from "ink-gradient";
import BigText from "ink-big-text";
import { ProgressBar } from "@inkjs/ui";
import figures from "figures";
import { PlaybackCoordinator } from "../../use-cases/playback-coordinator.js";
import { BrowseDirectory } from "../../use-cases/browse-directory.js";
import { PlayerState } from "../../domain/playback/player-state.js";
import { Lyrics } from "../../domain/lyrics/lyrics.js";
import { Spectrum } from "../../ports/spectrum.port.js";
import { AlbumArtReader } from "../../ports/album-art.port.js";
import { FilePicker } from "./FilePicker.js";
import { Mascot, MascotState } from "./Mascot.js";
import { Visualizer } from "./Visualizer.js";
import { CoverArt } from "./CoverArt.js";
import { CREAM } from "./theme.js";

type Props = {
  coordinator: PlaybackCoordinator;
  browseDirectory: BrowseDirectory;
  spectrum: Spectrum;
  albumArt: AlbumArtReader;
  filePath?: string;
  startDir: string;
};

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function LyricsPanel({ lyrics, position, width }: { lyrics: Lyrics; position: number; width: number }) {
  if (lyrics.isEmpty()) {
    return (
      <Box borderStyle="round" borderColor="gray" width={width} justifyContent="center" padding={1}>
        <Text color="gray" dimColor>sin letra — agrega un .lrc con el mismo nombre</Text>
      </Box>
    );
  }

  const current = lyrics.currentIndexAt(position);
  const context = 2;
  const start = Math.max(0, current - context);
  const end = Math.min(lyrics.lines.length, current + context + 1);
  const visible = lyrics.lines.slice(start, end);

  return (
    <Box borderStyle="round" borderColor="magenta" width={width} flexDirection="column" padding={1}>
      {visible.map((line, i) => {
        const realIndex = start + i;
        const isCurrent = realIndex === current;
        return (
          <Box key={realIndex} justifyContent="center">
            <Text bold={isCurrent} color={isCurrent ? "magentaBright" : "white"} dimColor={!isCurrent}>
              {isCurrent ? `${figures.pointer}  ${line.text}` : `   ${line.text}`}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

function Hint({ keys, label }: { keys: string; label: string }) {
  return (
    <Text>
      <Text color="cyanBright" bold>{keys}</Text>
      <Text color="gray"> {label}</Text>
    </Text>
  );
}

export function App({ coordinator, browseDirectory, spectrum, albumArt, filePath, startDir }: Props) {
  const { exit } = useApp();
  const [state, setState] = useState<PlayerState>(() => coordinator.currentState());
  const [screen, setScreen] = useState<"picker" | "player">(filePath ? "player" : "picker");
  const [termWidth, setTermWidth] = useState(process.stdout.columns || 80);
  const [excited, setExcited] = useState(false);
  const excitedTimer = useRef<NodeJS.Timeout | null>(null);
  const lastTitle = useRef<string>(coordinator.currentState().track.title);

  const triggerExcited = () => {
    setExcited(true);
    if (excitedTimer.current) clearTimeout(excitedTimer.current);
    excitedTimer.current = setTimeout(() => setExcited(false), 2000);
  };

  useEffect(() => {
    coordinator.subscribe((next) => {
      if (next.track.title && next.track.title !== lastTitle.current) {
        lastTitle.current = next.track.title;
        triggerExcited();
      }
      setState(next);
    });

    if (filePath) coordinator.playTrack(filePath);

    const onResize = () => setTermWidth(process.stdout.columns || 80);
    process.stdout.on("resize", onResize);
    return () => {
      process.stdout.off("resize", onResize);
      if (excitedTimer.current) clearTimeout(excitedTimer.current);
    };
  }, []);

  const handleSelect = (selectedPath: string) => {
    coordinator.playTrack(selectedPath);
    triggerExcited();
    setScreen("player");
  };

  useInput((input, key) => {
    if (screen !== "player") return;
    if (input === "q") { coordinator.stop().then(() => exit()); }
    if (input === " ") { coordinator.togglePause(); }
    if (input === "l" || key.rightArrow) { coordinator.seek(10); }
    if (input === "h" || key.leftArrow) { coordinator.seek(-10); }
    if (input === "n") { triggerExcited(); coordinator.next(); }
    if (input === "p") { triggerExcited(); coordinator.previous(); }
    if (input === "+" || input === "=") { coordinator.changeVolume(5); }
    if (input === "-" || input === "_") { coordinator.changeVolume(-5); }
    if (input === "m") { coordinator.toggleMute(); }
    if (input === "s") { coordinator.toggleShuffle(); }
    if (input === "r") { coordinator.cycleRepeat(); }
    if (input === "o") { coordinator.stop(); setScreen("picker"); }
  });

  if (screen === "picker") {
    return (
      <FilePicker
        onSelect={handleSelect}
        browseDirectory={browseDirectory}
        startDir={startDir}
        mascot={<Mascot state="walking" />}
      />
    );
  }

  const mascotState: MascotState = excited ? "excited" : state.playing ? "playing" : "paused";
  const w = Math.min(termWidth - 4, 96);
  const { track } = state;
  const percent = state.duration ? (state.position / state.duration) * 100 : 0;
  const volumePercent = state.muted ? 0 : Math.round((state.volume / 130) * 100);

  return (
    <Box flexDirection="column" paddingX={1} paddingY={0}>
      {/* Header: banner con gradiente + mascota */}
      <Box justifyContent="space-between" width={w} alignItems="center">
        <Gradient colors={CREAM}>
          <BigText text="TUNES" font="tiny" />
        </Gradient>
        <Mascot state={mascotState} />
      </Box>

      {/* Carátula + Now playing */}
      <Box gap={1} width={w}>
        <CoverArt reader={albumArt} trackPath={track.path} size={10} />
        <Box
          borderStyle="round"
          borderColor="magenta"
          flexDirection="column"
          flexGrow={1}
          paddingX={1}
        >
          <Box justifyContent="space-between">
            <Text bold color="whiteBright">
              {track.hasArtist() ? `${track.artist} — ` : ""}{track.title || "—"}
            </Text>
            {state.total > 0 && <Text color="gray" dimColor>{state.currentIndex + 1}/{state.total}</Text>}
          </Box>
          {track.hasAlbum() && <Text color="gray" dimColor>{track.album}</Text>}
          <Box gap={2} marginTop={1}>
            <Text color={state.playing ? "greenBright" : "yellow"}>
              {state.playing ? `${figures.play} reproduciendo` : "⏸ pausado"}
            </Text>
            {state.shuffle && <Text color="cyanBright">🔀 shuffle</Text>}
            {!state.repeat.isOff() && (
              <Text color="cyanBright">{state.repeat.isOne() ? "🔂 one" : "🔁 all"}</Text>
            )}
          </Box>
        </Box>
      </Box>

      {/* Barra de progreso */}
      <Box flexDirection="column" width={w} marginTop={0}>
        <Box width={w}>
          <ProgressBar value={percent} />
        </Box>
        <Box justifyContent="space-between" width={w}>
          <Text color="cyan">{formatTime(state.position)}</Text>
          <Text color="gray" dimColor>{formatTime(state.duration)}</Text>
        </Box>
      </Box>

      {/* Volumen */}
      <Box gap={1} width={w} alignItems="center">
        <Text>{state.muted ? "🔇" : "🔊"}</Text>
        <Box width={16}>
          <ProgressBar value={volumePercent} />
        </Box>
        <Text color="gray" dimColor>{state.muted ? "mute" : `${state.volume}%`}</Text>
      </Box>

      {/* Visualizador de espectro */}
      <Box width={w}>
        <Visualizer spectrum={spectrum} active={state.playing} width={w} />
      </Box>

      {/* Letras */}
      <LyricsPanel lyrics={state.lyrics} position={state.position} width={w} />

      {/* Controles */}
      <Box gap={2} flexWrap="wrap" width={w}>
        <Hint keys="spc" label="play/pause" />
        <Hint keys="p/n" label="ant/sig" />
        <Hint keys="h/l" label="-/+10s" />
        <Hint keys="-/+" label="vol" />
        <Hint keys="m" label="mute" />
        <Hint keys="s" label="shuffle" />
        <Hint keys="r" label="repeat" />
        <Hint keys="o" label="abrir" />
        <Hint keys="q" label="salir" />
      </Box>
    </Box>
  );
}
