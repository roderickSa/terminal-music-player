import { Box, Text, useInput } from "ink";
import { useState, useMemo, ReactNode } from "react";
import * as fs from "fs";
import * as path from "path";
import { isAudioFile } from "../config.js";

type Props = {
  onSelect: (filePath: string) => void;
  startDir: string;
  agumon?: ReactNode;
};

function readDir(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const folders = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => ({ name: "📁 " + e.name, fullPath: path.join(dir, e.name), isDir: true }));
  const files = entries
    .filter((e) => e.isFile() && isAudioFile(e.name))
    .map((e) => ({ name: "♪  " + e.name, fullPath: path.join(dir, e.name), isDir: false }));
  return [...folders, ...files];
}

const WINDOW_SIZE = 10;

export function FilePicker({ onSelect, startDir, agumon }: Props) {
  const [currentDir, setCurrentDir] = useState(() => startDir);
  const [items, setItems] = useState(() => readDir(startDir));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filtering, setFiltering] = useState(false);
  const [filter, setFilter] = useState("");

  const navigate = (dir: string) => {
    try {
      const newItems = readDir(dir);
      setCurrentDir(dir);
      setItems(newItems);
      setSelectedIndex(0);
      setFiltering(false);
      setFilter("");
    } catch {}
  };

  const filtered = useMemo(() => {
    if (!filter) return items;
    const q = filter.toLowerCase();
    return items.filter((it) => it.name.toLowerCase().includes(q));
  }, [items, filter]);

  const clamp = (i: number) => Math.max(0, Math.min(filtered.length - 1, i));

  useInput((input, key) => {
    if (filtering) {
      if (key.escape) { setFiltering(false); setFilter(""); setSelectedIndex(0); return; }
      if (key.return) {
        const item = filtered[selectedIndex];
        if (!item) return;
        if (item.isDir) navigate(item.fullPath);
        else { setFiltering(false); onSelect(item.fullPath); }
        return;
      }
      if (key.upArrow) { setSelectedIndex((i) => clamp(i - 1)); return; }
      if (key.downArrow) { setSelectedIndex((i) => clamp(i + 1)); return; }
      if (key.backspace || key.delete) { setFilter((f) => f.slice(0, -1)); setSelectedIndex(0); return; }
      if (input && !key.ctrl && !key.meta) { setFilter((f) => f + input); setSelectedIndex(0); }
      return;
    }

    if (input === "q") process.exit(0);
    if (input === "/") { setFiltering(true); setSelectedIndex(0); return; }
    if (key.upArrow) setSelectedIndex((i) => clamp(i - 1));
    if (key.downArrow) setSelectedIndex((i) => clamp(i + 1));
    if (key.return) {
      const item = filtered[selectedIndex];
      if (!item) return;
      if (item.isDir) navigate(item.fullPath);
      else onSelect(item.fullPath);
    }
    if (input === "b") navigate(path.dirname(currentDir));
  });

  const start = Math.max(
    0,
    Math.min(selectedIndex - Math.floor(WINDOW_SIZE / 2), Math.max(0, filtered.length - WINDOW_SIZE))
  );
  const visible = filtered.slice(start, start + WINDOW_SIZE);
  const above = start;
  const below = Math.max(0, filtered.length - (start + WINDOW_SIZE));

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1} gap={2} alignItems="center">
        <Text bold color="magenta">♪ Terminal Music Player</Text>
        {agumon}
      </Box>

      <Box marginBottom={1}>
        <Text color="gray">📂 </Text>
        <Text color="cyan">{currentDir}</Text>
      </Box>

      {(filtering || filter) && (
        <Box marginBottom={1}>
          <Text color="gray">🔍 </Text>
          <Text color="yellowBright">{filter}</Text>
          <Text color="gray">{filtering ? "▌" : ""}</Text>
          <Text color="gray" dimColor>  ({filtered.length})</Text>
        </Box>
      )}

      <Box borderStyle="round" borderColor="cyan" flexDirection="column" padding={1}>
        {filtered.length === 0 && (
          <Text color="gray">  {filter ? "Sin coincidencias" : "No hay archivos de audio aquí"}</Text>
        )}
        {above > 0 && <Text color="gray" dimColor>  ↑ {above} más</Text>}
        {visible.map((item, i) => {
          const realIndex = start + i;
          const isSelected = realIndex === selectedIndex;
          return (
            <Box key={item.fullPath}>
              <Text color={isSelected ? "cyan" : "white"} bold={isSelected}>
                {isSelected ? " ❯ " : "   "}{item.name}
              </Text>
            </Box>
          );
        })}
        {below > 0 && <Text color="gray" dimColor>  ↓ {below} más</Text>}
      </Box>

      <Box marginTop={1} gap={2}>
        <Text><Text color="gray">↑↓</Text> navegar</Text>
        <Text><Text color="gray">enter</Text> abrir</Text>
        <Text><Text color="gray">/</Text> buscar</Text>
        <Text><Text color="gray">b</Text> volver</Text>
        <Text><Text color="gray">q</Text> salir</Text>
      </Box>
    </Box>
  );
}
