import { Lyrics } from "./lyrics.js";
import { LyricLine } from "./lyric-line.js";

const TIME_TAG = /\[(\d+):(\d+(?:\.\d+)?)\]/g;
const OFFSET_TAG = /\[offset:\s*([+-]?\d+)\]/i;

/**
 * Parsea el contenido de un .lrc (string puro, sin tocar el filesystem).
 * Acepta `[mm:ss]` y `[mm:ss.xx]`, varios timestamps por línea y `[offset:±ms]`
 * (offset positivo = la letra aparece antes).
 */
export function parseLrc(content: string): Lyrics {
  const offset = readOffset(content);
  const lines: LyricLine[] = [];

  for (const rawLine of content.split("\n")) {
    const stamps = readTimestamps(rawLine);
    if (stamps.length === 0) continue;

    const text = rawLine.replace(TIME_TAG, "").trim();
    if (!text) continue;

    for (const stamp of stamps) lines.push(new LyricLine(stamp - offset, text));
  }

  return Lyrics.of(lines);
}

function readOffset(content: string): number {
  const match = content.match(OFFSET_TAG);
  return match ? parseInt(match[1], 10) / 1000 : 0;
}

function readTimestamps(line: string): number[] {
  const stamps: number[] = [];
  TIME_TAG.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TIME_TAG.exec(line)) !== null) {
    stamps.push(parseInt(match[1], 10) * 60 + parseFloat(match[2]));
  }
  return stamps;
}
