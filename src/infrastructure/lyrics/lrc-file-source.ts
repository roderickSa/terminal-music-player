import * as fs from "fs";
import * as path from "path";
import { LyricsSource } from "../../ports/lyrics-source.port.js";
import { Lyrics } from "../../domain/lyrics/lyrics.js";
import { parseLrc } from "../../domain/lyrics/lrc-parser.js";

/** Adapter que busca un .lrc con el mismo nombre que el audio y lo parsea. */
export class LrcFileSource implements LyricsSource {
  async loadFor(audioPath: string): Promise<Lyrics> {
    const lrcPath = this.lrcPathFor(audioPath);
    if (!fs.existsSync(lrcPath)) return Lyrics.empty();
    try {
      const content = await fs.promises.readFile(lrcPath, "utf-8");
      return parseLrc(content);
    } catch {
      return Lyrics.empty();
    }
  }

  private lrcPathFor(audioPath: string): string {
    const dir = path.dirname(audioPath);
    const base = path.basename(audioPath, path.extname(audioPath));
    return path.join(dir, `${base}.lrc`);
  }
}
