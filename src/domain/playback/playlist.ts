import { Random } from "../../ports/random.port.js";
import { RepeatMode } from "./repeat-mode.js";
import { Advance, AdvanceToTrack, StopPlayback } from "./advance.js";

/**
 * Lista de reproducción (dominio puro): conoce el orden, el índice actual,
 * el historial para shuffle y los modos. Decide qué pista sigue, sin saber
 * nada de mpv ni del filesystem.
 */
export class Playlist {
  private history: number[] = [];

  constructor(
    private readonly trackPaths: readonly string[],
    private index: number,
    private shuffleOn: boolean,
    private repeatMode: RepeatMode,
    private readonly random: Random,
  ) {}

  static empty(random: Random): Playlist {
    return new Playlist([], 0, false, RepeatMode.OFF, random);
  }

  static fromPaths(
    paths: readonly string[],
    startPath: string,
    shuffleOn: boolean,
    repeatMode: RepeatMode,
    random: Random,
  ): Playlist {
    const found = paths.indexOf(startPath);
    const start = found === -1 ? 0 : found;
    return new Playlist(paths, start, shuffleOn, repeatMode, random);
  }

  isEmpty(): boolean {
    return this.trackPaths.length === 0;
  }

  size(): number {
    return this.trackPaths.length;
  }

  currentIndex(): number {
    return this.index;
  }

  currentPath(): string {
    return this.trackPaths[this.index];
  }

  shuffle(): boolean {
    return this.shuffleOn;
  }

  repeat(): RepeatMode {
    return this.repeatMode;
  }

  /** El usuario pidió "siguiente": siempre avanza (con wrap). */
  selectNext(): void {
    this.history.push(this.index);
    this.index = this.forwardIndex();
  }

  /** El usuario pidió "anterior": usa historial si hay shuffle, si no retrocede. */
  selectPrevious(): void {
    if (this.shuffleOn && this.history.length > 0) {
      this.index = this.history.pop() ?? this.index;
      return;
    }
    this.index = (this.index - 1 + this.size()) % this.size();
  }

  /** La pista terminó sola: respeta repeat/shuffle y puede pedir parar. */
  advanceAfterEnd(): Advance {
    if (this.repeatMode.isOne()) return new AdvanceToTrack(this.index);

    const atLast = this.index === this.size() - 1;
    if (!this.shuffleOn && atLast && this.repeatMode.isOff()) {
      return new StopPlayback();
    }

    this.history.push(this.index);
    this.index = this.forwardIndex();
    return new AdvanceToTrack(this.index);
  }

  toggleShuffle(): void {
    this.shuffleOn = !this.shuffleOn;
    this.history = [];
  }

  cycleRepeat(): void {
    this.repeatMode = this.repeatMode.next();
  }

  private forwardIndex(): number {
    return this.shuffleOn ? this.randomOtherIndex() : (this.index + 1) % this.size();
  }

  private randomOtherIndex(): number {
    if (this.size() <= 1) return this.index;
    let candidate = this.index;
    while (candidate === this.index) {
      candidate = this.random.intBelow(this.size());
    }
    return candidate;
  }
}
