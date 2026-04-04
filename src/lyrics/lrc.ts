import * as fs from "fs";
import * as path from "path";

export type LrcLine = {
  time: number; // segundos
  text: string;
};

export function parseLrc(filePath: string): LrcLine[] {
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, "utf-8");
  const lines: LrcLine[] = [];

  for (const line of content.split("\n")) {
    const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
    if (!match) continue;
    const minutes = parseInt(match[1]);
    const seconds = parseFloat(match[2]);
    const text = match[3].trim();
    if (text) lines.push({ time: minutes * 60 + seconds, text });
  }

  return lines.sort((a, b) => a.time - b.time);
}

export function getCurrentLine(lines: LrcLine[], position: number): number {
  let current = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= position) current = i;
    else break;
  }
  return current;
}

export function getLrcPath(audioPath: string): string {
  const dir = path.dirname(audioPath);
  const base = path.basename(audioPath, path.extname(audioPath));
  return path.join(dir, `${base}.lrc`);
}
