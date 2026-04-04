import { Box, Text, useInput } from "ink";
import { useState } from "react";
import * as fs from "fs";
import * as path from "path";

type Props = {
  onSelect: (filePath: string) => void;
};
const DEFAULT_DIR = "/home/roder/Desktop/projects/terminal-music-player/src/music";
const AUDIO_EXTENSIONS = [".mp3", ".flac", ".ogg", ".wav", ".m4a", ".aac"];

function isAudio(file: string) {
  return AUDIO_EXTENSIONS.includes(path.extname(file).toLowerCase());
}

function readDir(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const folders = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => ({ name: "📁 " + e.name, fullPath: path.join(dir, e.name), isDir: true }));
  const files = entries
    .filter((e) => e.isFile() && isAudio(e.name))
    .map((e) => ({ name: "♪  " + e.name, fullPath: path.join(dir, e.name), isDir: false }));
  return [...folders, ...files];
}

export function FilePicker({ onSelect }: Props) {
  const [currentDir, setCurrentDir] = useState(() => DEFAULT_DIR);
  const [items, setItems] = useState(() => readDir(DEFAULT_DIR));
  const [selectedIndex, setSelectedIndex] = useState(0);

  const navigate = (dir: string) => {
    try {
      const newItems = readDir(dir);
      setCurrentDir(dir);
      setItems(newItems);
      setSelectedIndex(0);
    } catch {}
  };

  useInput((input, key) => {
    if (input === "q") process.exit(0);
    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    }
    if (key.downArrow) {
      setSelectedIndex((i) => Math.min(items.length - 1, i + 1));
    }
    if (key.return) {
      const item = items[selectedIndex];
      if (!item) return;
      if (item.isDir) {
        navigate(item.fullPath);
      } else {
        onSelect(item.fullPath);
      }
    }
    if (input === "b") {
      navigate(path.dirname(currentDir));
    }
  });

  // Ventana de 10 items visibles
  const windowSize = 10;
  const start = Math.max(0, selectedIndex - Math.floor(windowSize / 2));
  const visible = items.slice(start, start + windowSize);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="magenta">♪ Terminal Music Player</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray">📂 </Text>
        <Text color="cyan">{currentDir}</Text>
      </Box>

      <Box borderStyle="round" borderColor="cyan" flexDirection="column" padding={1}>
        {items.length === 0 && (
          <Text color="gray">  No hay archivos de audio aquí</Text>
        )}
        {visible.map((item, i) => {
          const realIndex = start + i;
          const isSelected = realIndex === selectedIndex;
          return (
            <Box key={item.fullPath}>
              <Text color={isSelected ? "cyan" : "white"} bold={isSelected}>
                {isSelected ? " ❯ " : "   "}
                {item.name}
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1} gap={2}>
        <Text><Text color="gray">↑↓</Text> navegar</Text>
        <Text><Text color="gray">enter</Text> abrir</Text>
        <Text><Text color="gray">b</Text> volver</Text>
        <Text><Text color="gray">q</Text> salir</Text>
      </Box>
    </Box>
  );
}
