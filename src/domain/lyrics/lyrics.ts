import { LyricLine } from "./lyric-line.js";

/** Conjunto de líneas de letra ordenadas por tiempo. */
export class Lyrics {
  private constructor(readonly lines: readonly LyricLine[]) {}

  static empty(): Lyrics {
    return new Lyrics([]);
  }

  static of(lines: readonly LyricLine[]): Lyrics {
    const sorted = [...lines].sort((a, b) => a.time - b.time);
    return new Lyrics(sorted);
  }

  isEmpty(): boolean {
    return this.lines.length === 0;
  }

  /** Índice de la línea vigente en la posición dada (la última cuyo tiempo ya pasó). */
  currentIndexAt(position: number): number {
    let current = 0;
    for (let i = 0; i < this.lines.length; i++) {
      if (this.lines[i].time <= position) current = i;
      else break;
    }
    return current;
  }
}
