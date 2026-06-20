import { describe, it, expect } from "vitest";
import { Playlist } from "../../../src/domain/playback/playlist.js";
import { RepeatMode } from "../../../src/domain/playback/repeat-mode.js";
import { AdvanceToTrack, StopPlayback } from "../../../src/domain/playback/advance.js";
import { Random } from "../../../src/ports/random.port.js";

const TRACKS = ["a.mp3", "b.mp3", "c.mp3"];

/** Random determinista: devuelve los valores en orden. */
class ScriptedRandom implements Random {
  private calls = 0;
  constructor(private readonly values: number[]) {}
  intBelow(): number {
    return this.values[this.calls++] ?? 0;
  }
}

function linear(index = 0): Playlist {
  return new Playlist(TRACKS, index, false, RepeatMode.OFF, new ScriptedRandom([]));
}

describe("Playlist (lineal)", () => {
  it("selectNext avanza con wrap", () => {
    const p = linear(2);
    p.selectNext();
    expect(p.currentIndex()).toBe(0);
    expect(p.currentPath()).toBe("a.mp3");
  });

  it("selectPrevious retrocede con wrap", () => {
    const p = linear(0);
    p.selectPrevious();
    expect(p.currentIndex()).toBe(2);
  });

  it("advanceAfterEnd para en la última con repeat off", () => {
    const p = linear(2);
    expect(p.advanceAfterEnd()).toBeInstanceOf(StopPlayback);
  });

  it("advanceAfterEnd con repeat all hace wrap", () => {
    const p = new Playlist(TRACKS, 2, false, RepeatMode.ALL, new ScriptedRandom([]));
    const advance = p.advanceAfterEnd();
    expect(advance).toBeInstanceOf(AdvanceToTrack);
    expect(p.currentIndex()).toBe(0);
  });

  it("advanceAfterEnd con repeat one se queda en la misma", () => {
    const p = new Playlist(TRACKS, 1, false, RepeatMode.ONE, new ScriptedRandom([]));
    const advance = p.advanceAfterEnd();
    expect(advance).toBeInstanceOf(AdvanceToTrack);
    expect(p.currentIndex()).toBe(1);
  });
});

describe("Playlist (shuffle)", () => {
  it("nunca repite el índice actual al avanzar", () => {
    const p = new Playlist(TRACKS, 0, true, RepeatMode.OFF, new ScriptedRandom([0, 0, 2]));
    p.selectNext();
    expect(p.currentIndex()).toBe(2); // ignora los 0 (== actual) hasta un distinto
  });

  it("selectPrevious vuelve por el historial", () => {
    const p = new Playlist(TRACKS, 0, true, RepeatMode.OFF, new ScriptedRandom([2]));
    p.selectNext(); // 0 -> 2, historial = [0]
    p.selectPrevious(); // vuelve a 0
    expect(p.currentIndex()).toBe(0);
  });

  it("toggleShuffle limpia el historial", () => {
    const p = new Playlist(TRACKS, 0, true, RepeatMode.OFF, new ScriptedRandom([2, 1]));
    p.selectNext();
    p.toggleShuffle(); // ahora lineal, historial vacío
    p.selectPrevious();
    expect(p.currentIndex()).toBe(1); // (2 - 1) lineal, no por historial
  });
});

describe("Playlist (bordes)", () => {
  it("una sola pista en shuffle no se cuelga", () => {
    const p = new Playlist(["solo.mp3"], 0, true, RepeatMode.OFF, new ScriptedRandom([]));
    p.selectNext();
    expect(p.currentIndex()).toBe(0);
  });

  it("isEmpty para lista vacía", () => {
    expect(Playlist.empty(new ScriptedRandom([])).isEmpty()).toBe(true);
  });
});
