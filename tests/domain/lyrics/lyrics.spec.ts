import { describe, it, expect } from "vitest";
import { Lyrics } from "../../../src/domain/lyrics/lyrics.js";
import { LyricLine } from "../../../src/domain/lyrics/lyric-line.js";

describe("Lyrics.currentIndexAt", () => {
  const lyrics = Lyrics.of([
    new LyricLine(0, "a"),
    new LyricLine(5, "b"),
    new LyricLine(10, "c"),
  ]);

  it("devuelve la última línea cuyo tiempo ya pasó", () => {
    expect(lyrics.currentIndexAt(0)).toBe(0);
    expect(lyrics.currentIndexAt(6)).toBe(1);
    expect(lyrics.currentIndexAt(100)).toBe(2);
  });

  it("vacío devuelve 0 y reporta isEmpty", () => {
    expect(Lyrics.empty().isEmpty()).toBe(true);
    expect(Lyrics.empty().currentIndexAt(3)).toBe(0);
  });
});
