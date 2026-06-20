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

  // [offset:±ms] — desplaza toda la letra (+ = aparece antes)
  let offset = 0;
  const offsetMatch = content.match(/\[offset:\s*([+-]?\d+)\]/i);
  if (offsetMatch) offset = parseInt(offsetMatch[1], 10) / 1000;

  // acepta [mm:ss] y [mm:ss.xx(x)]; puede haber varios por línea
  const timeTag = /\[(\d+):(\d+(?:\.\d+)?)\]/g;

  for (const line of content.split("\n")) {
    const stamps: number[] = [];
    let m: RegExpExecArray | null;
    timeTag.lastIndex = 0;
    while ((m = timeTag.exec(line)) !== null) {
      stamps.push(parseInt(m[1], 10) * 60 + parseFloat(m[2]));
    }
    if (stamps.length === 0) continue;

    const text = line.replace(timeTag, "").trim();
    if (!text) continue;

    for (const t of stamps) lines.push({ time: t - offset, text });
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
