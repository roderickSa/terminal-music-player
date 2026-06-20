import { Box, Text, useApp, useInput } from "ink";
import { useState, useEffect, useRef } from "react";
import { PlaybackCoordinator } from "../../use-cases/playback-coordinator.js";
import { BrowseDirectory } from "../../use-cases/browse-directory.js";
import { PlayerState } from "../../domain/playback/player-state.js";
import { Lyrics } from "../../domain/lyrics/lyrics.js";
import { FilePicker } from "./FilePicker.js";
import { Agumon, AgumonState } from "./Agumon.js";

type Props = {
  coordinator: PlaybackCoordinator;
  browseDirectory: BrowseDirectory;
  filePath?: string;
  startDir: string;
};

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ProgressBar({ pos, dur, width }: { pos: number; dur: number; width: number }) {
  if (!dur) return <Text color="gray">{"─".repeat(width)}</Text>;
  const filled = Math.floor((pos / dur) * width);
  const empty = Math.max(0, width - filled);
  const percent = pos / dur;
  const color = percent < 0.5 ? "cyan" : percent < 0.8 ? "magenta" : "redBright";
  return (
    <Box>
      <Text color={color}>{"█".repeat(filled)}</Text>
      <Text color="gray" dimColor>{"─".repeat(empty)}</Text>
    </Box>
  );
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
          <Box key={realIndex} flexDirection="column" alignItems="center">
            <Text bold={isCurrent} color={isCurrent ? "whiteBright" : "white"} dimColor={!isCurrent}>
              {isCurrent ? `›  ${line.text}` : `   ${line.text}`}
            </Text>
            <Text> </Text>
          </Box>
        );
      })}
    </Box>
  );
}

export function App({ coordinator, browseDirectory, filePath, startDir }: Props) {
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
        agumon={<Agumon state="walking" />}
      />
    );
  }

  const agumonState: AgumonState = excited ? "excited" : state.playing ? "playing" : "paused";
  const w = termWidth - 4;
  const { track } = state;

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      <Box justifyContent="space-between" width={w} alignItems="flex-start">
        <Box flexDirection="column" gap={1}>
          <Box gap={2}>
            <Text bold color="magenta">♪ Terminal Music Player</Text>
            {state.total > 0 && <Text color="gray">{state.currentIndex + 1} / {state.total}</Text>}
          </Box>
          <Box flexDirection="column">
            <Text bold color="white">
              {track.hasArtist() ? `${track.artist} — ` : ""}{track.title}
            </Text>
            {track.hasAlbum() && <Text color="gray" dimColor>{track.album}</Text>}
          </Box>
          <Box gap={2}>
            <Text color={state.playing ? "greenBright" : "yellow"}>
              {state.playing ? "▶  reproduciendo" : "⏸  pausado"}
            </Text>
            <Text color={state.muted ? "red" : "gray"}>
              {state.muted ? "🔇 mute" : `🔊 ${state.volume}%`}
            </Text>
            {state.shuffle && <Text color="cyanBright">🔀</Text>}
            {!state.repeat.isOff() && (
              <Text color="cyanBright">{state.repeat.isOne() ? "🔂" : "🔁"}</Text>
            )}
          </Box>
        </Box>

        <Agumon state={agumonState} />
      </Box>

      <Box flexDirection="column">
        <ProgressBar pos={state.position} dur={state.duration} width={w} />
        <Box justifyContent="space-between" width={w}>
          <Text color="gray" dimColor>{formatTime(state.position)}</Text>
          <Text color="gray" dimColor>{formatTime(state.duration)}</Text>
        </Box>
      </Box>

      <LyricsPanel lyrics={state.lyrics} position={state.position} width={w} />

      <Box gap={2} flexWrap="wrap">
        <Text><Text color="cyanBright">spc</Text> play/pause</Text>
        <Text><Text color="cyanBright">p/n</Text> ant/sig</Text>
        <Text><Text color="cyanBright">h/l</Text> -/+10s</Text>
        <Text><Text color="cyanBright">-/+</Text> vol</Text>
        <Text><Text color="cyanBright">m</Text> mute</Text>
        <Text><Text color="cyanBright">s</Text> shuffle</Text>
        <Text><Text color="cyanBright">r</Text> repeat</Text>
        <Text><Text color="cyanBright">o</Text> abrir</Text>
        <Text><Text color="cyanBright">q</Text> salir</Text>
      </Box>
    </Box>
  );
}
