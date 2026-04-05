import { Box, Text, useApp, useInput } from "ink";
import { useState, useEffect } from "react";
import { MPVPlayer, MPVStatus } from "../audio/mpv.js";
import { FilePicker } from "./FilePicker.js";
import { parseLrc, getCurrentLine, getLrcPath, LrcLine } from "../lyrics/lrc.js";
import { Agumon, AgumonState } from "./Agumon.js";

type Props = { player: MPVPlayer; filePath?: string };

export function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function ProgressBar({ pos, dur, width }: { pos: number; dur: number; width: number }) {
  if (!dur) return <Text color="gray">{"─".repeat(width)}</Text>;
  const filled = Math.floor((pos / dur) * width);
  const empty = width - filled;
  const percent = pos / dur;
  const color = percent < 0.5 ? "cyan" : percent < 0.8 ? "magenta" : "redBright";
  return (
    <Box>
      <Text color={color}>{"█".repeat(filled)}</Text>
      <Text color="gray" dimColor>{"─".repeat(empty)}</Text>
    </Box>
  );
}

function LyricsPanel({ lines, position, width }: { lines: LrcLine[]; position: number; width: number }) {
  if (lines.length === 0) {
    return (
      <Box borderStyle="round" borderColor="gray" width={width} justifyContent="center" padding={1}>
        <Text color="gray" dimColor>sin letra — agrega un .lrc con el mismo nombre</Text>
      </Box>
    );
  }

  const current = getCurrentLine(lines, position);
  const context = 2;
  const start = Math.max(0, current - context);
  const end = Math.min(lines.length, current + context + 1);
  const visible = lines.slice(start, end);

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

export function App({ player, filePath }: Props) {
  const { exit } = useApp();
  const [status, setStatus] = useState<MPVStatus>(player.status);
  const [screen, setScreen] = useState<"picker" | "player">(filePath ? "player" : "picker");
  const [lyrics, setLyrics] = useState<LrcLine[]>([]);
  const [termWidth, setTermWidth] = useState(process.stdout.columns || 80);
  const [excited, setExcited] = useState(false);

  useEffect(() => {
    (player as any).onStatusChange = (s: MPVStatus) => {
      setStatus((prev) => {
        // detectar cambio de canción → emocionado brevemente
        if (prev.title !== s.title && s.title) {
          setExcited(true);
          setTimeout(() => setExcited(false), 2000);
        }
        return s;
      });
      if (s.path) setLyrics(parseLrc(getLrcPath(s.path)));
    };
    if (filePath) player.load(filePath).catch(console.error);

    const onResize = () => setTermWidth(process.stdout.columns || 80);
    process.stdout.on("resize", onResize);
    return () => { process.stdout.off("resize", onResize); };
  }, []);

  const handleSelect = (selectedPath: string) => {
    player.load(selectedPath).catch(console.error);
    setExcited(true);
    setTimeout(() => setExcited(false), 2000);
    setScreen("player");
  };

  useInput((input, key) => {
    if (screen !== "player") return;
    if (input === "q") { player.quit().then(exit); }
    if (input === " ") { player.togglePause(); }
    if (input === "l" || key.rightArrow) { player.seek(10); }
    if (input === "h" || key.leftArrow) { player.seek(-10); }
    if (input === "n") {
      setExcited(true);
      setTimeout(() => setExcited(false), 2000);
      player.next();
    }
    if (input === "p") { player.prev(); }
    if (input === "o") { player.quit(); setScreen("picker"); }
  });

  if (screen === "picker") {
    return <FilePicker onSelect={handleSelect} agumon={<Agumon state="walking" />} />;
  }

  const agumonState: AgumonState = excited ? "excited" : status.playing ? "playing" : "paused";
  const w = termWidth - 4;
  const title = status.title.replace(/\.[^/.]+$/, "");

  return (
    <Box flexDirection="column" padding={1} gap={1}>

      {/* Header con Agumon a la derecha */}
      <Box justifyContent="space-between" width={w} alignItems="flex-start">
        <Box flexDirection="column" gap={1}>
          <Box gap={2}>
            <Text bold color="magenta">♪ Terminal Music Player</Text>
            {status.total > 0 && <Text color="gray">{status.currentIndex + 1} / {status.total}</Text>}
          </Box>
          <Text bold color="white">{title}</Text>
          <Text color={status.playing ? "greenBright" : "yellow"}>
            {status.playing ? "▶  reproduciendo" : "⏸  pausado"}
          </Text>
        </Box>

        <Agumon state={agumonState} />
      </Box>

      <Box flexDirection="column">
        <ProgressBar pos={status.position} dur={status.duration} width={w} />
        <Box justifyContent="space-between" width={w}>
          <Text color="gray" dimColor>{formatTime(status.position)}</Text>
          <Text color="gray" dimColor>{formatTime(status.duration)}</Text>
        </Box>
      </Box>

      <LyricsPanel lines={lyrics} position={status.position} width={w} />

      <Box gap={2}>
        <Text><Text color="cyanBright">spc</Text> play/pause</Text>
        <Text><Text color="cyanBright">p/n</Text> ant/sig</Text>
        <Text><Text color="cyanBright">h/l</Text> -/+10s</Text>
        <Text><Text color="cyanBright">o</Text> abrir</Text>
        <Text><Text color="cyanBright">q</Text> salir</Text>
      </Box>

    </Box>
  );
}
