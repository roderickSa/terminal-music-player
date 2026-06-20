import { describe, it, expect } from "vitest";
import { parseLrc } from "./lrc-parser.js";

describe("parseLrc", () => {
  it("parsea timestamps con decimales", () => {
    const lyrics = parseLrc("[00:12.50]hola\n[00:15.00]mundo");
    expect(lyrics.lines.map((l) => l.text)).toEqual(["hola", "mundo"]);
    expect(lyrics.lines[0].time).toBeCloseTo(12.5);
  });

  it("acepta timestamps sin decimales", () => {
    const lyrics = parseLrc("[01:05]linea");
    expect(lyrics.lines[0].time).toBe(65);
  });

  it("soporta varios timestamps por línea", () => {
    const lyrics = parseLrc("[00:01][00:05]coro");
    expect(lyrics.lines).toHaveLength(2);
    expect(lyrics.lines.map((l) => l.time)).toEqual([1, 5]);
  });

  it("aplica el offset (positivo adelanta)", () => {
    const lyrics = parseLrc("[offset:500]\n[00:10.00]x");
    expect(lyrics.lines[0].time).toBeCloseTo(9.5);
  });

  it("ignora líneas sin timestamp o sin texto", () => {
    const lyrics = parseLrc("[ti:titulo]\n[00:03.00]\n[00:04.00]válida");
    expect(lyrics.lines.map((l) => l.text)).toEqual(["válida"]);
  });

  it("ordena por tiempo", () => {
    const lyrics = parseLrc("[00:09.00]b\n[00:01.00]a");
    expect(lyrics.lines.map((l) => l.text)).toEqual(["a", "b"]);
  });
});
